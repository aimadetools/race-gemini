import { jest } from '@jest/globals';

const mockDbQuery = jest.fn();
jest.mock('../../db/index.js', () => ({
  query: (...args) => mockDbQuery(...args),
}));

const mockSendEmail = jest.fn();
jest.mock('../../lib/email.js', () => ({
  sendEmail: (...args) => mockSendEmail(...args),
}));

import handler from '../../api/cron-seo-report.js';
import httpMocks from 'node-mocks-http';

describe('cron-seo-report API', () => {
  let mockReq;
  let mockRes;
  let mockKv;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { 
      ...originalEnv, 
      CRON_SECRET: 'test-cron-secret',
      DISABLE_EMAIL_OUTREACH: 'false'
    };
    
    mockReq = httpMocks.createRequest({
      method: 'POST',
      url: '/api/cron-seo-report',
      headers: {
        authorization: 'Bearer test-cron-secret',
      },
    });
    
    mockRes = httpMocks.createResponse();

    mockKv = {
      lrange: jest.fn().mockResolvedValue([]),
    };

    mockDbQuery.mockReset();
    mockSendEmail.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return 405 if method is not POST', async () => {
    mockReq.method = 'GET';
    await handler(mockReq, mockRes, mockKv);
    expect(mockRes.statusCode).toBe(405);
    const data = JSON.parse(mockRes._getData());
    expect(data.message).toBe('Method Not Allowed');
  });

  it('should return 401 if authorization header is invalid', async () => {
    mockReq.headers.authorization = 'Bearer wrong-secret';
    await handler(mockReq, mockRes, mockKv);
    expect(mockRes.statusCode).toBe(401);
    const data = JSON.parse(mockRes._getData());
    expect(data.message).toBe('Unauthorized');
  });

  it('should return 200 with disabled status if DISABLE_EMAIL_OUTREACH is true', async () => {
    process.env.DISABLE_EMAIL_OUTREACH = 'true';
    await handler(mockReq, mockRes, mockKv);
    expect(mockRes.statusCode).toBe(200);
    const data = JSON.parse(mockRes._getData());
    expect(data).toEqual({ disabled: true, reason: 'Email outreach is disabled' });
    expect(mockDbQuery).not.toHaveBeenCalled();
  });

  it('should process and send weekly reports to users with generated pages', async () => {
    // 1. Mock select users list query
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, email: 'paid@example.com', name: 'Paid User' },
        { id: 2, email: 'unpaid@example.com', name: 'Unpaid User' }
      ]
    });

    // --- MOCKS FOR USER 1 (Paid User) ---
    // Pages count query
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ count: '10' }]
    });
    // Views/Visitors events query
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ views_count: '120', visitors_count: '45' }]
    });
    // Leads in last 7 days
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ count: '5' }]
    });
    // checkIsPaidUser: users subscription status check
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ is_agency: false, subscription_status: 'active' }]
    });
    // Pages indexed count query
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ count: '8' }]
    });

    // --- MOCKS FOR USER 2 (Unpaid User) ---
    // Pages count query
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ count: '3' }]
    });
    // Views/Visitors events query
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ views_count: '15', visitors_count: '8' }]
    });
    // Leads in last 7 days
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ count: '2' }]
    });
    // checkIsPaidUser: users subscription status check (unpaid, not active)
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ is_agency: false, subscription_status: 'none' }]
    });
    // checkIsPaidUser: KV transaction check (mockKv returning empty transactions list)
    mockKv.lrange.mockResolvedValueOnce([]);
    // Locked leads query (unpaid user)
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ count: '2' }]
    });
    // Pages indexed count query
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ count: '1' }]
    });

    await handler(mockReq, mockRes, mockKv);

    expect(mockRes.statusCode).toBe(200);
    const data = JSON.parse(mockRes._getData());
    expect(data).toEqual({
      message: 'Weekly SEO report compilation completed successfully.',
      usersReported: 2,
      emailsSent: 2
    });

    // Verify emails were sent via sendEmail mock
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    
    // User 1 email checks
    const firstCall = mockSendEmail.mock.calls[0];
    expect(firstCall[0]).toBe('paid@example.com');
    expect(firstCall[1]).toBe('Your LocalLeads SEO Performance Weekly Report');
    expect(firstCall[2]).toContain('🎉 Awesome Work! 5 New Leads This Week');
    expect(firstCall[2]).toContain('120'); // Views count
    expect(firstCall[2]).toContain('45');  // Visitors count
    expect(firstCall[2]).not.toContain('🔒 Action Required');

    // User 2 email checks
    const secondCall = mockSendEmail.mock.calls[1];
    expect(secondCall[0]).toBe('unpaid@example.com');
    expect(secondCall[1]).toBe('Your LocalLeads SEO Performance Weekly Report');
    expect(secondCall[2]).toContain('🔒 Action Required: 2 Locked Leads Waiting');
    expect(secondCall[2]).toContain('15'); // Views count
    expect(secondCall[2]).toContain('8');  // Visitors count
    expect(secondCall[2]).toContain('Unlock Leads Now');
  });

  it('should handle database query failures and return 500', async () => {
    mockDbQuery.mockRejectedValueOnce(new Error('PostgreSQL syntax error'));

    await handler(mockReq, mockRes, mockKv);

    expect(mockRes.statusCode).toBe(500);
    const data = JSON.parse(mockRes._getData());
    expect(data.message).toBe('Internal Server Error');
    expect(data.error).toBe('PostgreSQL syntax error');
  });
});
