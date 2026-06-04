import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    lrange: jest.fn(),
  },
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

import handler from '../../api/export-leads';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { clearMockUsers, addMockUser, setQueryDelegate } from '../../db/mockDb.js';

describe('Export Leads API', () => {
  let req;
  let res;
  let mockKv;

  beforeEach(() => {
    mockKv = {
      lrange: jest.fn(),
    };

    req = {
      method: 'GET',
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
    setQueryDelegate(null);
    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should return 405 for non-GET methods', async () => {
    req.method = 'POST';
    await handler(req, res, mockKv);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('should return 401 if no token is provided', async () => {
    parseCookie.mockReturnValue({});
    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated. Please log in.' });
  });

  test('should return 401 if token is invalid', async () => {
    parseCookie.mockReturnValue({ authToken: 'invalid_token' });
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('should return 403 for unpaid users', async () => {
    const userId = 123;
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });
    
    // Add user as unpaid
    const mockUser = {
      id: userId,
      email: 'free@example.com',
      is_agency: false,
      subscription_status: 'inactive'
    };
    addMockUser(mockUser);

    mockKv.lrange.mockResolvedValue([]); // No transactions

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lead export is a premium feature. Please upgrade to a paid pack to unlock your leads.'
    });
  });

  test('should return 200 and CSV content for paid agency users', async () => {
    const userId = 123;
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });

    const mockUser = {
      id: userId,
      email: 'agency@example.com',
      is_agency: true,
      subscription_status: 'inactive'
    };
    addMockUser(mockUser);

    // Mock query delegate to return leads
    setQueryDelegate((text, params) => {
      const textLower = text.toLowerCase();
      if (textLower.includes('select name, email, phone, message, url, created_at from leads')) {
        return {
          rows: [
            {
              name: 'John Doe',
              email: 'john@example.com',
              phone: '123-456-7890',
              message: 'Hello, I need a plumber, thanks!',
              url: '/123/plumbing.html',
              created_at: new Date('2026-06-04T12:00:00Z')
            }
          ]
        };
      }
      // fallback to default mock users
      if (textLower.includes('select is_agency, subscription_status from users')) {
        return {
          rows: [mockUser]
        };
      }
      return { rows: [] };
    });

    await handler(req, res, mockKv);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=localleads-captured-leads.csv');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Name,Email,Phone,Message,Source Page URL,Date Captured'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('John Doe,john@example.com,123-456-7890,"Hello, I need a plumber, thanks!",/123/plumbing.html,2026-06-04T12:00:00.000Z'));
  });

  test('should return 200 and CSV content for paid subscription users', async () => {
    const userId = 123;
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });

    const mockUser = {
      id: userId,
      email: 'sub@example.com',
      is_agency: false,
      subscription_status: 'active'
    };
    addMockUser(mockUser);

    setQueryDelegate((text, params) => {
      const textLower = text.toLowerCase();
      if (textLower.includes('select name, email, phone, message, url, created_at from leads')) {
        return {
          rows: [
            {
              name: 'Jane Smith',
              email: 'jane@example.com',
              phone: '987-654-3210',
              message: 'Hello there',
              url: '/123/cleaning.html',
              created_at: new Date('2026-06-04T13:00:00Z')
            }
          ]
        };
      }
      if (textLower.includes('select is_agency, subscription_status from users')) {
        return {
          rows: [mockUser]
        };
      }
      return { rows: [] };
    });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Jane Smith,jane@example.com,987-654-3210,Hello there,/123/cleaning.html,2026-06-04T13:00:00.000Z'));
  });

  test('should return 200 and CSV content for users with credit transactions', async () => {
    const userId = 123;
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });

    const mockUser = {
      id: userId,
      email: 'credits@example.com',
      is_agency: false,
      subscription_status: 'inactive'
    };
    addMockUser(mockUser);

    // Mock KV to return a positive purchase transaction
    mockKv.lrange.mockResolvedValue([
      JSON.stringify({ amount: 50, description: 'Purchased credits pack' })
    ]);

    setQueryDelegate((text, params) => {
      const textLower = text.toLowerCase();
      if (textLower.includes('select name, email, phone, message, url, created_at from leads')) {
        return {
          rows: [
            {
              name: 'Quote Required',
              email: 'quote@example.com',
              phone: '555-555-5555',
              message: 'Need a price list',
              url: '/123/painting.html',
              created_at: new Date('2026-06-04T14:00:00Z')
            }
          ]
        };
      }
      if (textLower.includes('select is_agency, subscription_status from users')) {
        return {
          rows: [mockUser]
        };
      }
      return { rows: [] };
    });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Quote Required,quote@example.com,555-555-5555,Need a price list,/123/painting.html,2026-06-04T14:00:00.000Z'));
  });
});
