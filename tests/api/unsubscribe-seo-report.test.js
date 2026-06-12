import { jest } from '@jest/globals';

const mockDbQuery = jest.fn();
jest.mock('../../db/index.js', () => ({
  query: (...args) => mockDbQuery(...args),
}));

import handler from '../../api/unsubscribe-seo-report.js';
import httpMocks from 'node-mocks-http';

describe('unsubscribe-seo-report API', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = httpMocks.createRequest({
      method: 'GET',
      url: '/api/unsubscribe-seo-report',
      query: {
        email: 'user@example.com',
      },
    });

    mockRes = httpMocks.createResponse();
    mockDbQuery.mockReset();
  });

  it('should return 405 if method is not GET', async () => {
    mockReq.method = 'POST';
    await handler(mockReq, mockRes);
    expect(mockRes.statusCode).toBe(405);
    const data = mockRes._getData();
    expect(data).toContain('Method Not Allowed');
  });

  it('should return 400 if no email is provided', async () => {
    mockReq.query.email = '';
    await handler(mockReq, mockRes);
    expect(mockRes.statusCode).toBe(400);
    const data = mockRes._getData();
    expect(data).toContain('Invalid Link');
    expect(data).toContain('No email address was provided');
  });

  it('should update weekly_report_enabled to false and return HTML with success message', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rowCount: 1,
    });

    await handler(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    const data = mockRes._getData();
    expect(data).toContain('Unsubscribed');
    expect(data).toContain('You have successfully unsubscribed from the Weekly SEO Performance Report for');
    expect(data).toContain('user@example.com');

    expect(mockDbQuery).toHaveBeenCalledTimes(1);
    const sqlQuery = mockDbQuery.mock.calls[0][0];
    const sqlParams = mockDbQuery.mock.calls[0][1];
    expect(sqlQuery).toContain('UPDATE users SET weekly_report_enabled = FALSE');
    expect(sqlParams).toEqual(['user@example.com']);
  });

  it('should return HTML with already unsubscribed/not-found message if rowCount is 0', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rowCount: 0,
    });

    await handler(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(200);
    const data = mockRes._getData();
    expect(data).toContain('Already Unsubscribed');
    expect(data).toContain('is not currently subscribed or was already removed');
  });

  it('should handle database exception and return 500 HTML page', async () => {
    mockDbQuery.mockRejectedValueOnce(new Error('PostgreSQL connection timeout'));

    await handler(mockReq, mockRes);

    expect(mockRes.statusCode).toBe(500);
    const data = mockRes._getData();
    expect(data).toContain('Internal Server Error');
    expect(data).toContain('We encountered an issue processing your unsubscribe request');
  });
});
