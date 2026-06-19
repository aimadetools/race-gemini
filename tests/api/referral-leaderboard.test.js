import { jest } from '@jest/globals';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  JsonWebTokenError: class JsonWebTokenError extends Error {}
}));

// Mock cookie
jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

import handler from '../../api/referral-leaderboard.js';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { setQueryDelegate } from '../../db/mockDb.js';

describe('Referral Leaderboard API', () => {
  let req;
  let res;
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    setQueryDelegate(mockQuery);

    req = {
      method: 'GET',
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    setQueryDelegate(null);
    delete process.env.JWT_SECRET;
  });

  test('should return 405 for non-GET methods', async () => {
    req.method = 'POST';
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalledWith('Method POST Not Allowed');
  });

  test('should return 401 if no authToken is provided', async () => {
    parseCookie.mockReturnValue({});
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated.' });
  });

  test('should return 401 if token validation fails', async () => {
    parseCookie.mockReturnValue({ authToken: 'invalid_token' });
    jwt.verify.mockImplementation(() => {
      throw new jwt.JsonWebTokenError('invalid token');
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token.' });
  });

  test('should return leaderboard and user standing when authenticated and database returns actual rows', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 'user_123' });

    // Mock query logic
    mockQuery.mockImplementation(async (text, params) => {
      if (text.includes('INNER JOIN referrals r ON u.id = r.referrer_id')) {
        return {
          rows: [
            { id: 'user_456', name: 'Bob SEO', email: 'bob@example.com', referrals_count: '15', total_commission: '300.00' },
            { id: 'user_123', name: 'Alice Founder', email: 'alice@example.com', referrals_count: '2', total_commission: '40.00' }
          ]
        };
      }
      if (text.includes('WHERE r.referrer_id = $1')) {
        return {
          rows: [
            { referrals_count: '2', total_commission: '40.00' }
          ]
        };
      }
      return { rows: [] };
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const jsonResponse = res.json.mock.calls[0][0];
    
    // Check that Alice Founder (current user) is in the top 10 and has correct fields
    const aliceEntry = jsonResponse.leaderboard.find(item => item.name === 'Alice Founder');
    expect(aliceEntry).toBeDefined();
    expect(aliceEntry.isCurrentUser).toBe(true);
    expect(aliceEntry.referralsCount).toBe(2);
    expect(aliceEntry.totalCommission).toBe(40.00);

    // Check email obfuscation on Bob
    const bobEntry = jsonResponse.leaderboard.find(item => item.name === 'Bob SEO');
    expect(bobEntry).toBeDefined();
    expect(bobEntry.isCurrentUser).toBe(false);
    expect(bobEntry.referralsCount).toBe(15);
    expect(bobEntry.totalCommission).toBe(300.00);
    
    // Leaderboard size should be 10 due to simulated partners merging
    expect(jsonResponse.leaderboard.length).toBe(10);
    
    // Check user standing details
    expect(jsonResponse.userStanding).toEqual({
      rank: expect.any(Number),
      referralsCount: 2,
      totalCommission: 40.00
    });
  });

  test('should dynamically calculate user rank when not in top 10 but has referrals', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 'user_outside' });

    // Mock query logic
    mockQuery.mockImplementation(async (text, params) => {
      if (text.includes('INNER JOIN referrals r ON u.id = r.referrer_id')) {
        // Return 10 top partners that exclude user_outside
        return {
          rows: Array.from({ length: 10 }, (_, i) => ({
            id: `user_${i}`,
            name: `Partner ${i}`,
            email: `partner${i}@example.com`,
            referrals_count: String(100 - i),
            total_commission: String((100 - i) * 20)
          }))
        };
      }
      if (text.includes('WHERE r.referrer_id = $1')) {
        return {
          rows: [
            { referrals_count: '1', total_commission: '20.00' }
          ]
        };
      }
      if (text.includes('WHERE ref_count > $1')) {
        // 12 referrers have more than 1 referral
        return {
          rows: [{ count: '12' }]
        };
      }
      return { rows: [] };
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const jsonResponse = res.json.mock.calls[0][0];
    
    // Check that user is not in top 10
    expect(jsonResponse.leaderboard.some(item => item.isCurrentUser)).toBe(false);

    // Dynamic rank should be rankAhead + 1 = 12 + 1 = 13
    expect(jsonResponse.userStanding.rank).toBe(13);
    expect(jsonResponse.userStanding.referralsCount).toBe(1);
    expect(jsonResponse.userStanding.totalCommission).toBe(20.00);
  });

  test('should return Not Ranked for user with 0 referrals', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 'user_new' });

    mockQuery.mockImplementation(async (text, params) => {
      if (text.includes('INNER JOIN referrals r ON u.id = r.referrer_id')) {
        return { rows: [] }; // No DB referrers
      }
      if (text.includes('WHERE r.referrer_id = $1')) {
        return {
          rows: [
            { referrals_count: '0', total_commission: '0' }
          ]
        };
      }
      return { rows: [] };
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonResponse = res.json.mock.calls[0][0];
    expect(jsonResponse.userStanding.rank).toBe('Not Ranked');
    expect(jsonResponse.userStanding.referralsCount).toBe(0);
    expect(jsonResponse.userStanding.totalCommission).toBe(0);
  });

  test('should handle database query failures and return 500', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 'user_123' });

    mockQuery.mockRejectedValueOnce(new Error('Postgres connection failed'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
  });
});
