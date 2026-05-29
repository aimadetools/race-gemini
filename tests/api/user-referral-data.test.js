import { jest } from '@jest/globals';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  JsonWebTokenError: class JsonWebTokenError extends Error {}
}));

// Mock fs for logError function
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

// Mock path for logError function
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn(),
}));

import handler from '../../api/user-referral-data';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { logError } from '../../lib/logger.js';
import { setQueryDelegate } from '../../db/mockDb.js';

describe('user-referral-data API', () => {
  let req;
  let res;
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    setQueryDelegate(mockQuery);

    req = {
      method: 'GET',
      headers: {},
      cookies: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();

    process.env.JWT_SECRET = 'test_secret';
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

    // Mock fs and path for logError function
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockReturnValue(undefined);
    fs.appendFileSync.mockReturnValue(undefined);
    path.join.mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    setQueryDelegate(null);
    delete process.env.JWT_SECRET;
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  test('should return 405 for non-GET methods', async () => {
    req.method = 'POST';
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalledWith('Method POST Not Allowed');
  });

  test('should return 401 if no token is provided', async () => {
    req.cookies = {}; // No token

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated.' });
  });

  test('should return 401 if token is invalid', async () => {
    req.cookies = { authToken: 'invalid_token' };
    jwt.verify.mockImplementation(() => { throw new jwt.JsonWebTokenError('invalid token'); });

    await handler(req, res);

    expect(jwt.verify).toHaveBeenCalledWith('invalid_token', 'test_secret');
    expect(logError).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token.' });
  });

  test('should return referral data for authenticated user', async () => {
    const userId = 'user123';
    req.cookies = { authToken: 'valid_token' };
    jwt.verify.mockReturnValue({ userId });

    // Mock PostgreSQL query returns
    mockQuery.mockImplementation(async (text, params) => {
      if (text.includes('SELECT referral_code, referral_clicks FROM users')) {
        return { rows: [{ referral_code: 'REF123', referral_clicks: 5 }] };
      }
      if (text.includes('COUNT(*) AS signups')) {
        return { rows: [{ signups: '2', totalearned: '50.00' }] };
      }
      if (text.includes('JOIN users u ON r.referred_id')) {
        return {
          rows: [
            { email: 'referred@example.com', date: '2026-04-01', status: 'Completed', commission: '50.00' }
          ]
        };
      }
      return { rows: [] };
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      referralCode: 'REF123',
      clicks: 5,
      signups: 2,
      totalEarned: 50.00,
      referredUsers: [
        { email: 'referred@example.com', date: '2026-04-01', status: 'Completed', commission: '50.00' }
      ]
    });
  });

  test('should handle internal server error during database operations', async () => {
    const userId = 'user123';
    req.cookies = { authToken: 'valid_token' };
    jwt.verify.mockReturnValue({ userId });

    mockQuery.mockRejectedValueOnce(new Error('Database query failed'));

    await handler(req, res);

    expect(logError).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
  });
});
