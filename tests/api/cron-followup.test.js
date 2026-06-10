import { jest } from '@jest/globals';

const mockDbQuery = jest.fn();
jest.mock('../../db/index.js', () => ({
  query: (...args) => mockDbQuery(...args),
}));

const mockSendEmail = jest.fn();
jest.mock('../../lib/email.js', () => ({
  sendEmail: (...args) => mockSendEmail(...args),
}));

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

  it('should execute follow-up sequence successfully', async () => {
    // Mock database responses for all three steps
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

    mockSendEmail.mockResolvedValue(true);

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Success. Sent 3 follow-up emails.' });

    // Verify correct update queries were run
    expect(mockDbQuery).toHaveBeenCalledTimes(6);
    expect(mockDbQuery.mock.calls[1][0]).toContain('UPDATE leads');
    expect(mockDbQuery.mock.calls[1][0]).toContain('last_followup_step = 1');
    expect(mockDbQuery.mock.calls[1][1]).toEqual([1]);

    expect(mockDbQuery.mock.calls[3][0]).toContain('UPDATE leads');
    expect(mockDbQuery.mock.calls[3][0]).toContain('last_followup_step = 2');
    expect(mockDbQuery.mock.calls[3][1]).toEqual([2]);

    expect(mockDbQuery.mock.calls[5][0]).toContain('UPDATE leads');
    expect(mockDbQuery.mock.calls[5][0]).toContain('last_followup_step = 3');
    expect(mockDbQuery.mock.calls[5][1]).toEqual([3]);

    // Verify emails were sent
    expect(mockSendEmail).toHaveBeenCalledTimes(3);
    expect(mockSendEmail.mock.calls[0][0]).toBe('lead1@example.com');
    expect(mockSendEmail.mock.calls[0][1]).toContain('Did you see the missed local SEO opportunities');
    expect(mockSendEmail.mock.calls[1][0]).toBe('lead2@example.com');
    expect(mockSendEmail.mock.calls[1][1]).toContain('Simple math: How service area pages grow your business');
    expect(mockSendEmail.mock.calls[2][0]).toBe('lead3@example.com');
    expect(mockSendEmail.mock.calls[2][1]).toContain('Special offer: Get 20% off LocalLeads package');
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
