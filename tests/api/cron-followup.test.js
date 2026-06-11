import { jest } from '@jest/globals';

const mockDbQuery = jest.fn();
jest.mock('../../db/index.js', () => ({
  query: (...args) => mockDbQuery(...args),
}));

const mockSendEmail = jest.fn();
jest.mock('../../lib/email.js', () => ({
  sendEmail: (...args) => mockSendEmail(...args),
}));

jest.mock('@vercel/kv', () => ({
  kv: {
    lrange: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  },
}));
import { kv } from '@vercel/kv';

import handler from '../../api/cron-followup.js';

describe('cron-followup API', () => {
  let mockReq;
  let mockRes;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CRON_SECRET: 'test-cron-secret' };
    
    mockReq = {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-cron-secret',
      },
    };
    
    mockRes = {
      _status: 200,
      _json: {},
      status: jest.fn(function (code) {
        this._status = code;
        return this;
      }),
      json: jest.fn(function (data) {
        this._json = data;
        return this;
      }),
      setHeader: jest.fn(),
    };

    mockDbQuery.mockReset();
    mockSendEmail.mockReset();
    kv.lrange.mockReset();
    kv.get.mockReset();
    kv.set.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return 405 if method is not POST', async () => {
    mockReq.method = 'GET';
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(405);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
  });

  it('should return 401 if authorization header is invalid', async () => {
    mockReq.headers.authorization = 'Bearer wrong-secret';
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  it('should execute follow-up sequence and new drip sequence successfully', async () => {
    // Mock database responses for all three steps of free-audit
    // Step 1: 1 lead to process
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, email: 'lead1@example.com', url: 'example1.com', created_at: new Date() }
      ]
    });
    // Update query for Step 1
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    // Step 2: 1 lead to process
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { id: 2, email: 'lead2@example.com', url: 'example2.com', created_at: new Date() }
      ]
    });
    // Update query for Step 2
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    // Step 3: 1 lead to process
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { id: 3, email: 'lead3@example.com', url: 'example3.com', created_at: new Date() }
      ]
    });
    // Update query for Step 3
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    // Step 4 (drip sequence): 1 unpaid user with locked leads
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { id: 42, email: 'unpaid@example.com', created_at: new Date(), last_lead_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
      ]
    });

    // Mock KV transactions list for user (no purchase transactions)
    kv.lrange.mockResolvedValueOnce([]);
    // Mock KV drip step is 0 (unsent)
    kv.get.mockResolvedValueOnce(null);
    kv.get.mockResolvedValueOnce(null);
    kv.set.mockResolvedValue('OK');

    mockSendEmail.mockResolvedValue(true);

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Success. Sent 4 follow-up emails.' });

    // Verify correct update queries were run for audit leads
    expect(mockDbQuery.mock.calls[1][0]).toContain('UPDATE leads');
    expect(mockDbQuery.mock.calls[1][0]).toContain('last_followup_step = 1');
    expect(mockDbQuery.mock.calls[1][1]).toEqual([1]);

    expect(mockDbQuery.mock.calls[3][0]).toContain('UPDATE leads');
    expect(mockDbQuery.mock.calls[3][0]).toContain('last_followup_step = 2');
    expect(mockDbQuery.mock.calls[3][1]).toEqual([2]);

    expect(mockDbQuery.mock.calls[5][0]).toContain('UPDATE leads');
    expect(mockDbQuery.mock.calls[5][0]).toContain('last_followup_step = 3');
    expect(mockDbQuery.mock.calls[5][1]).toEqual([3]);

    // Verify drip step set was called
    expect(kv.set).toHaveBeenCalledWith('user:42:drip_step', 1);

    // Verify emails were sent (3 for audit, 1 for drip)
    expect(mockSendEmail).toHaveBeenCalledTimes(4);
    expect(mockSendEmail.mock.calls[0][0]).toBe('lead1@example.com');
    expect(mockSendEmail.mock.calls[0][1]).toContain('Did you see the missed local SEO opportunities');
    expect(mockSendEmail.mock.calls[1][0]).toBe('lead2@example.com');
    expect(mockSendEmail.mock.calls[1][1]).toContain('Simple math: How service area pages grow your business');
    expect(mockSendEmail.mock.calls[2][0]).toBe('lead3@example.com');
    expect(mockSendEmail.mock.calls[2][1]).toContain('Special offer: Get 20% off LocalLeads package');
    expect(mockSendEmail.mock.calls[3][0]).toBe('unpaid@example.com');
    expect(mockSendEmail.mock.calls[3][1]).toContain('Unlocks waiting: You have new leads in your LocalLeads dashboard!');
  });

  it('should skip paid users or users with purchases in the drip sequence', async () => {
    // Audit steps return empty
    mockDbQuery.mockResolvedValueOnce({ rows: [] });
    mockDbQuery.mockResolvedValueOnce({ rows: [] });
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    // Drip step returns 1 unpaid user with locked leads
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { id: 42, email: 'unpaid@example.com', created_at: new Date(), last_lead_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
      ]
    });

    // Mock KV transactions list for user (amount > 0 exists, so paid user)
    kv.lrange.mockResolvedValueOnce([
      JSON.stringify({ amount: 99.00, date: new Date() })
    ]);

    mockSendEmail.mockResolvedValue(true);

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Success. Sent 0 follow-up emails.' });

    // SendEmail and kv.set should not be called since user is skipped
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(kv.set).not.toHaveBeenCalled();
  });

  it('should process drip step 2 if last drip email was sent >= 3 days ago', async () => {
    // Audit steps return empty
    mockDbQuery.mockResolvedValueOnce({ rows: [] });
    mockDbQuery.mockResolvedValueOnce({ rows: [] });
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    // Drip step returns 1 unpaid user with locked leads
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { id: 42, email: 'unpaid@example.com', created_at: new Date(), last_lead_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
      ]
    });

    // Mock KV transactions list for user (no purchase transactions)
    kv.lrange.mockResolvedValueOnce([]);
    // Mock KV drip step is 1
    kv.get.mockResolvedValueOnce(1);
    // Mock KV drip last sent is 4 days ago
    kv.get.mockResolvedValueOnce(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString());
    kv.set.mockResolvedValue('OK');

    mockSendEmail.mockResolvedValue(true);

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Success. Sent 1 follow-up emails.' });

    // Verify email and KV set for step 2
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0]).toBe('unpaid@example.com');
    expect(mockSendEmail.mock.calls[0][1]).toContain("Don't let your captured leads go cold");
    expect(kv.set).toHaveBeenCalledWith('user:42:drip_step', 2);
  });

  it('should process drip step 3 if last drip email was sent >= 3 days ago', async () => {
    // Audit steps return empty
    mockDbQuery.mockResolvedValueOnce({ rows: [] });
    mockDbQuery.mockResolvedValueOnce({ rows: [] });
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    // Drip step returns 1 unpaid user with locked leads
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { id: 42, email: 'unpaid@example.com', created_at: new Date(), last_lead_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }
      ]
    });

    // Mock KV transactions list for user (no purchase transactions)
    kv.lrange.mockResolvedValueOnce([]);
    // Mock KV drip step is 2
    kv.get.mockResolvedValueOnce(2);
    // Mock KV drip last sent is 4 days ago
    kv.get.mockResolvedValueOnce(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString());
    kv.set.mockResolvedValue('OK');

    mockSendEmail.mockResolvedValue(true);

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Success. Sent 1 follow-up emails.' });

    // Verify email and KV set for step 3
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0]).toBe('unpaid@example.com');
    expect(mockSendEmail.mock.calls[0][1]).toContain("Final reminder: Unlock your leads with 20% off");
    expect(kv.set).toHaveBeenCalledWith('user:42:drip_step', 3);
  });

  it('should handle database query failures gracefully', async () => {
    mockDbQuery.mockRejectedValueOnce(new Error('DB connection failure'));
    
    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Internal Server Error',
      error: 'DB connection failure'
    }));
  });
});
