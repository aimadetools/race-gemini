import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    smembers: jest.fn(),
    scard: jest.fn(),
    lrange: jest.fn(),
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
import { logError } from '../../lib/logger.js';
import { clearMockUsers, addMockUser, setQueryDelegate } from '../../db/mockDb.js';

describe('dashboard API', () => {
  let req;
  let res;
  let mockKv;

  beforeEach(() => {
    mockKv = {
      get: jest.fn(),
      smembers: jest.fn(),
      scard: jest.fn(),
      lrange: jest.fn(),
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
    clearMockUsers();
    setQueryDelegate(null); // Reset query delegate

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
    expect(logError).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token. Please log in again.' });
  });

  test('should return 404 if userId is not found from decoded token', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 'user123' });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User profile not found. Please log in again.' });
  });

  test('should successfully retrieve dashboard data with generated pages', async () => {
    const userId = 'user123';
    const userEmail = 'test@example.com';
    const pageId1 = 'page1';
    const pageId2 = 'page2';

    const user = {
      id: userId,
      email: userEmail,
      credits: 50,
    };
    addMockUser(user);

    const page1Data = { title: 'Page 1', service: 'Plumbing', town: 'Dallas' };
    const page2Data = { title: 'Page 2', service: 'Cleaning', town: 'Houston' };

    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });
    mockKv.smembers.mockResolvedValueOnce([pageId1, pageId2]); // user:userId:pages -> pageIds
    mockKv.get.mockResolvedValueOnce(JSON.stringify(page1Data)); // pageId1 -> page1Data
    mockKv.get.mockResolvedValueOnce(10); // page:pageId1:views -> 10
    mockKv.scard.mockResolvedValueOnce(5); // page:pageId1:unique_visitors -> 5
    mockKv.get.mockResolvedValueOnce(JSON.stringify(page2Data)); // pageId2 -> page2Data
    mockKv.get.mockResolvedValueOnce(20); // page:pageId2:views -> 20
    mockKv.scard.mockResolvedValueOnce(15); // page:pageId2:unique_visitors -> 15
    mockKv.lrange.mockResolvedValueOnce([]); // Mock transaction list
    mockKv.lrange.mockResolvedValueOnce([]); // Mock notification list

    await handler(req, res, mockKv);

    expect(mockKv.smembers).toHaveBeenCalledWith(`user:${userId}:pages`);
    expect(mockKv.get).toHaveBeenCalledWith(pageId1);
    expect(mockKv.get).toHaveBeenCalledWith(`page:${pageId1}:views`);
    expect(mockKv.scard).toHaveBeenCalledWith(`page:${pageId1}:unique_visitors`);
    expect(mockKv.get).toHaveBeenCalledWith(pageId2);
    expect(mockKv.get).toHaveBeenCalledWith(`page:${pageId2}:views`);
    expect(mockKv.scard).toHaveBeenCalledWith(`page:${pageId2}:unique_visitors`);
    expect(mockKv.lrange).toHaveBeenCalledWith(`user:${userId}:credittransactions`, 0, 100);
    expect(mockKv.lrange).toHaveBeenCalledWith(`user:${userId}:notifications`, 0, 49);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      email: user.email,
      credits: user.credits,
      generatedPages: [
        { ...page1Data, pageId: pageId1, url: `/${userId}/plumbing-in-dallas.html`, views: 10, uniqueVisitors: 5 },
        { ...page2Data, pageId: pageId2, url: `/${userId}/cleaning-in-houston.html`, views: 20, uniqueVisitors: 15 },
      ],
      creditTransactions: [],
      indexingNotifications: [],
      leads: [],
      isPaidUser: false
    });
  });

  test('should return 500 for internal server error during database operations', async () => {
    const userId = 'user123';

    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });
    setQueryDelegate(() => { throw new Error('DB connection failed'); });

    await handler(req, res, mockKv);

    expect(logError).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
  });

  test('should handle empty generatedPages gracefully', async () => {
    const userId = 'user123';
    const userEmail = 'test@example.com';

    const user = {
      id: userId,
      email: userEmail,
      credits: 50,
    };
    addMockUser(user);

    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });
    mockKv.smembers.mockResolvedValueOnce([]); // user:userId:pages -> empty array
    mockKv.lrange.mockResolvedValueOnce([]); // Mock transaction list
    mockKv.lrange.mockResolvedValueOnce([]); // Mock notification list

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      email: user.email,
      credits: user.credits,
      generatedPages: [],
      creditTransactions: [],
      indexingNotifications: [],
      leads: [],
      isPaidUser: false
    });
  });
});
