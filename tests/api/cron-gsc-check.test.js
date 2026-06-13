import { jest } from '@jest/globals';

const mockDbQuery = jest.fn();
jest.mock('../../db/index.js', () => ({
  query: (...args) => mockDbQuery(...args),
}));

const mockCheckGscIndexingStatus = jest.fn();
jest.mock('../../lib/gsc.js', () => ({
  checkGscIndexingStatus: (...args) => mockCheckGscIndexingStatus(...args),
}));

const mockAddIndexingNotification = jest.fn();
jest.mock('../../lib/indexing.js', () => ({
  addIndexingNotification: (...args) => mockAddIndexingNotification(...args),
}));

const mockSendEmail = jest.fn();
jest.mock('../../lib/email.js', () => ({
  sendEmail: (...args) => mockSendEmail(...args),
}));

import handler from '../../api/cron-gsc-check.js';
import httpMocks from 'node-mocks-http';

describe('cron-gsc-check API', () => {
  let mockReq;
  let mockRes;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CRON_SECRET: 'test-cron-secret' };
    
    mockReq = httpMocks.createRequest({
      method: 'POST',
      url: '/api/cron-gsc-check',
      headers: {
        authorization: 'Bearer test-cron-secret',
      },
    });
    
    mockRes = httpMocks.createResponse();

    mockDbQuery.mockReset();
    mockCheckGscIndexingStatus.mockReset();
    mockAddIndexingNotification.mockReset();
    mockSendEmail.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return 405 if method is not POST', async () => {
    mockReq.method = 'GET';
    await handler(mockReq, mockRes);
    expect(mockRes.statusCode).toBe(405);
    const data = JSON.parse(mockRes._getData());
    expect(data.message).toBe('Method Not Allowed');
  });

  it('should return 401 if authorization header is invalid', async () => {
    mockReq.headers.authorization = 'Bearer wrong-secret';
    await handler(mockReq, mockRes);
    expect(mockRes.statusCode).toBe(401);
    const data = JSON.parse(mockRes._getData());
    expect(data.message).toBe('Unauthorized');
  });

  it('should process indexing check for active and agency users successfully', async () => {
    // 1. Fetch users (User 1 and User 2)
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, email: 'agency@example.com', custom_domain: 'agency.com' },
        { id: 2, email: 'pro@example.com', custom_domain: null }
      ]
    });

    // 2. Fetch pages for user 1 (Seattle Plumbing)
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { id: 10, service: 'Plumbing', town: 'Seattle', business_name: 'Seattle Plumbers', indexing_status: 'unknown' }
      ]
    });

    // 3. Mock GSC check result for user 1's page
    mockCheckGscIndexingStatus.mockResolvedValueOnce({
      success: true,
      coverageState: 'Indexed, primary'
    });

    // 4. Update database for user 1's page
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    // 5. Fetch pages for user 2 (Austin Cleaning)
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { id: 20, service: 'Cleaning', town: 'Austin', business_name: 'Austin Cleaners', indexing_status: 'Indexed, primary' }
      ]
    });

    // 6. Mock GSC check result for user 2's page
    mockCheckGscIndexingStatus.mockResolvedValueOnce({
      success: true,
      coverageState: 'Indexed, primary'
    });

    // 7. Update database for user 2's page
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    mockAddIndexingNotification.mockResolvedValue(true);

    await handler(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    const data = JSON.parse(mockRes._getData());
    expect(data).toEqual({
      message: 'Weekly Search Console automated index sync completed.',
      checked: 2,
      updated: 2,
      failed: 0,
      notificationsSent: 1
    });

    // Verify Search Console status checker was called with correct URLs
    expect(mockCheckGscIndexingStatus).toHaveBeenCalledTimes(2);
    expect(mockCheckGscIndexingStatus.mock.calls[0]).toEqual([
      'https://agency.com/plumbing-in-seattle.html',
      'https://agency.com/'
    ]);
    
    // Verify user 2 uses default localseogen.com domain url
    const defaultDomain = process.env.DOMAIN_URL || 'https://www.localseogen.com';
    expect(mockCheckGscIndexingStatus.mock.calls[1]).toEqual([
      `${defaultDomain}/2/cleaning-in-austin.html`,
      `${defaultDomain}/`
    ]);

    // Verify DB updates were executed
    expect(mockDbQuery.mock.calls[2][0]).toContain('UPDATE seo_pages SET indexing_status = $1');
    expect(mockDbQuery.mock.calls[2][1]).toEqual(['Indexed, primary', 10]);

    expect(mockDbQuery.mock.calls[4][0]).toContain('UPDATE seo_pages SET indexing_status = $1');
    expect(mockDbQuery.mock.calls[4][1]).toEqual(['Indexed, primary', 20]);

    // Verify notification was sent for user 1 (status changed from unknown to Indexed)
    expect(mockAddIndexingNotification).toHaveBeenCalledTimes(1);
    expect(mockAddIndexingNotification.mock.calls[0][0]).toBe(1);
    expect(mockAddIndexingNotification.mock.calls[0][1]).toContain('changed from "unknown" to "Indexed, primary"');

    // Verify email alert was sent to the user whose page got indexed
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0]).toBe('agency@example.com');
    expect(mockSendEmail.mock.calls[0][1]).toContain('Page Indexed');
  });

  it('should handle failures on Search Console inspection gracefully', async () => {
    // 1. Fetch users
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, email: 'agency@example.com', custom_domain: null }
      ]
    });

    // 2. Fetch pages
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { id: 10, service: 'Plumbing', town: 'Seattle', business_name: 'Seattle Plumbers', indexing_status: 'unknown' }
      ]
    });

    // 3. Mock GSC check result to fail
    mockCheckGscIndexingStatus.mockResolvedValueOnce({
      success: false,
      error: 'Quota exceeded'
    });

    await handler(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    const data = JSON.parse(mockRes._getData());
    expect(data).toEqual({
      message: 'Weekly Search Console automated index sync completed.',
      checked: 1,
      updated: 0,
      failed: 1,
      notificationsSent: 0
    });

    // No updates or notifications should occur
    expect(mockAddIndexingNotification).not.toHaveBeenCalled();
  });

  it('should handle database query failures gracefully', async () => {
    mockDbQuery.mockRejectedValueOnce(new Error('Postgres connection failed'));
    
    await handler(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    const data = JSON.parse(mockRes._getData());
    expect(data.message).toBe('Internal Server Error');
    expect(data.error).toBe('Postgres connection failed');
  });
});
