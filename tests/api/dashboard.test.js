import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    smembers: jest.fn(),
    scard: jest.fn(),
  },
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'), // Keep actual fs functionality for some parts if needed, otherwise mock completely
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'), // Keep actual path functionality for some parts if needed
  join: jest.fn(),
}));

import handler from '../../api/dashboard';
import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import fs from 'fs';
import path from 'path';

describe('dashboard API', () => {
  let req;
  let res;
  let mockKv;

  beforeEach(() => {
    mockKv = {
      get: jest.fn(),
      smembers: jest.fn(),
      scard: jest.fn(),
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

    // Mock process.env.JWT_SECRET
    process.env.JWT_SECRET = 'test_secret';

    // Mock fs and path for logError function
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockReturnValue(undefined);
    fs.appendFileSync.mockReturnValue(undefined);
    path.join.mockImplementation((...args) => args.join('/')); // Simple join for testing log path
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should return 405 for non-GET methods', async () => {
    req.method = 'POST';
    await handler(req, res, mockKv);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalledWith('Method POST Not Allowed');
  });

  test('should return 401 if no token is provided', async () => {
    parseCookie.mockReturnValue({}); // No cookie header

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

  test('should return 404 if userId is not found from decoded token', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 'user123' });
    mockKv.get.mockResolvedValueOnce(null); // userEmail is null for userId:user123

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith('userId:user123');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found. Please log in again.' });
  });

  test('should return 404 if user profile is not found', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 'user123' });
    mockKv.get.mockResolvedValueOnce('test@example.com'); // user email found
    mockKv.get.mockResolvedValueOnce(null); // user profile not found

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith('userId:user123');
    expect(mockKv.get).toHaveBeenCalledWith('user:test@example.com');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User profile not found.' });
  });

  test('should successfully retrieve dashboard data with generated pages', async () => {
    const userId = 'user123';
    const userEmail = 'test@example.com';
    const pageId1 = 'page1';
    const pageId2 = 'page2';

    const user = {
      email: userEmail,
      credits: 50,
    };

    const page1Data = { title: 'Page 1', url: 'http://example.com/page1' };
    const page2Data = { title: 'Page 2', url: 'http://example.com/page2' };

    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });
    mockKv.get.mockResolvedValueOnce(userEmail); // userId:user123 -> userEmail
    mockKv.get.mockResolvedValueOnce(JSON.stringify(user)); // user:userEmail -> user object
    mockKv.smembers.mockResolvedValueOnce([pageId1, pageId2]); // user:userId:pages -> pageIds
    mockKv.get.mockResolvedValueOnce(JSON.stringify(page1Data)); // pageId1 -> page1Data
    mockKv.get.mockResolvedValueOnce(10); // page:pageId1:views -> 10
    mockKv.scard.mockResolvedValueOnce(5); // page:pageId1:unique_visitors -> 5
    mockKv.get.mockResolvedValueOnce(JSON.stringify(page2Data)); // pageId2 -> page2Data
    mockKv.get.mockResolvedValueOnce(20); // page:pageId2:views -> 20
    mockKv.scard.mockResolvedValueOnce(15); // page:pageId2:unique_visitors -> 15

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith(`userId:${userId}`);
    expect(mockKv.get).toHaveBeenCalledWith(`user:${userEmail}`);
    expect(mockKv.smembers).toHaveBeenCalledWith(`user:${userId}:pages`);
    expect(mockKv.get).toHaveBeenCalledWith(pageId1);
    expect(mockKv.get).toHaveBeenCalledWith(`page:${pageId1}:views`);
    expect(mockKv.scard).toHaveBeenCalledWith(`page:${pageId1}:unique_visitors`);
    expect(mockKv.get).toHaveBeenCalledWith(pageId2);
    expect(mockKv.get).toHaveBeenCalledWith(`page:${pageId2}:views`);
    expect(mockKv.scard).toHaveBeenCalledWith(`page:${pageId2}:unique_visitors`); // Corrected typo here

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      email: user.email,
      credits: user.credits,
      generatedPages: [
        { ...page1Data, pageId: pageId1, views: 10, uniqueVisitors: 5 },
        { ...page2Data, pageId: pageId2, views: 20, uniqueVisitors: 15 },
      ],
    });
  });

  test('should return 500 for internal server error during KV operations', async () => {
    const userId = 'user123';
    const userEmail = 'test@example.com';

    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });
    mockKv.get.mockResolvedValueOnce(userEmail); // userId:user123 -> userEmail
    mockKv.get.mockRejectedValueOnce(new Error('KV connection failed')); // Error on getting user profile

    await handler(req, res, mockKv);

    expect(fs.appendFileSync).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
  });

  test('should handle empty generatedPages gracefully', async () => {
    const userId = 'user123';
    const userEmail = 'test@example.com';

    const user = {
      email: userEmail,
      credits: 50,
    };

    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });
    mockKv.get.mockResolvedValueOnce(userEmail); // userId:user123 -> userEmail
    mockKv.get.mockResolvedValueOnce(JSON.stringify(user)); // user:userEmail -> user object
    mockKv.smembers.mockResolvedValueOnce([]); // user:userId:pages -> empty array

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      email: user.email,
      credits: user.credits,
      generatedPages: [],
    });
  });
});
