import { jest } from '@jest/globals';

// Mock KV
jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

// Mock cookie parser
jest.mock('cookie', () => ({
  parse: jest.fn(),
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
import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import fs from 'fs';
import path from 'path';

describe('user-referral-data API', () => {
  let req;
  let res;
  let mockKv;

  beforeEach(() => {
    mockKv = {
      get: jest.fn(),
      set: jest.fn(),
    };

    req = {
      method: 'GET',
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
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
    delete process.env.JWT_SECRET;
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  test('should return 405 for non-GET methods', async () => {
    req.method = 'POST';
    await handler(req, res, mockKv);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalledWith('Method POST Not Allowed');
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

    expect(jwt.verify).toHaveBeenCalledWith('invalid_token', 'test_secret');
    expect(fs.appendFileSync).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token. Please log in again.' });
  });

  test('should return referral data for authenticated user', async () => {
    const userId = 'user123';
    const mockReferralData = {
      referralLink: `http://localhost:3000/referral-signup?ref=${userId}`,
      totalReferrals: 10,
      convertedReferrals: 5,
      earnedRewards: 150.00,
      recentReferrals: [
        { id: 'refA', userEmail: 'a@example.com', status: 'Converted', date: '2026-04-01', reward: 25.00 },
      ],
    };

    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });
    mockKv.get.mockResolvedValueOnce(JSON.stringify(mockReferralData)); // Existing referral data in KV

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith(`user:${userId}:referral_data`);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockReferralData);
  });

  test('should return default referral data if no existing data in KV', async () => {
    const userId = 'user123';
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });
    mockKv.get.mockResolvedValueOnce(null); // No existing referral data in KV

    const expectedDefaultData = {
      referralLink: `http://localhost:3000/referral-signup?ref=${userId}`,
      totalReferrals: 0,
      convertedReferrals: 0,
      earnedRewards: 0.00,
      recentReferrals: [
        { id: 'ref1', userEmail: 'user1@example.com', status: 'Converted', date: '2026-04-15', reward: 25.00 },
        { id: 'ref2', userEmail: 'user2@example.com', status: 'Pending', date: '2026-04-10', reward: 0.00 },
        { id: 'ref3', userEmail: 'user3@example.com', status: 'Converted', date: '2026-03-20', reward: 50.00 },
        { id: 'ref4', userEmail: 'user4@example.com', status: 'Pending', date: '2026-03-01', reward: 0.00 },
      ],
    };

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith(`user:${userId}:referral_data`);
    expect(mockKv.set).toHaveBeenCalledWith(`user:${userId}:referral_data`, JSON.stringify(expectedDefaultData));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedDefaultData);
  });

  test('should handle internal server error during KV operations', async () => {
    const userId = 'user123';
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });
    mockKv.get.mockRejectedValueOnce(new Error('KV connection failed'));

    await handler(req, res, mockKv);

    expect(fs.appendFileSync).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to fetch referral data.', error: 'KV connection failed' });
  });
});
