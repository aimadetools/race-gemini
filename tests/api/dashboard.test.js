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
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn(),
}));

import handler from '../../api/dashboard';
import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import fs from 'fs';
import path from 'path';
import { logError } from '../../lib/logger.js';
import { clearMockUsers, addMockUser, addMockSeoPage, setQueryDelegate } from '../../db/mockDb.js';

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
    setQueryDelegate(null);

    process.env.JWT_SECRET = 'test_secret';

    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockReturnValue(undefined);
    fs.appendFileSync.mockReturnValue(undefined);
    path.join.mockImplementation((...args) => args.join('/'));
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

    const createdAtDate = new Date('2026-06-03T19:00:00.000Z');
    addMockSeoPage({
      id: pageId1,
      user_id: userId,
      business_name: 'Page 1',
      service: 'Plumbing',
      town: 'Dallas',
      zip_code: '75001',
      created_at: createdAtDate,
      updated_at: createdAtDate,
      telephone: null,
      price_range: null,
      opening_hours: null,
      enable_ai_copy: null,
      ai_style: null
    });

    addMockSeoPage({
      id: pageId2,
      user_id: userId,
      business_name: 'Page 2',
      service: 'Cleaning',
      town: 'Houston',
      zip_code: '77001',
      created_at: createdAtDate,
      updated_at: createdAtDate,
      telephone: null,
      price_range: null,
      opening_hours: null,
      enable_ai_copy: null,
      ai_style: null
    });

    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });

    mockKv.get.mockImplementation((key) => {
      if (key === `page:${pageId1}:views`) return Promise.resolve(10);
      if (key === `page:${pageId2}:views`) return Promise.resolve(20);
      return Promise.resolve(null);
    });

    mockKv.scard.mockImplementation((key) => {
      if (key === `page:${pageId1}:unique_visitors`) return Promise.resolve(5);
      if (key === `page:${pageId2}:unique_visitors`) return Promise.resolve(15);
      return Promise.resolve(0);
    });

    mockKv.lrange.mockResolvedValue([]);

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith(`page:${pageId1}:views`);
    expect(mockKv.scard).toHaveBeenCalledWith(`page:${pageId1}:unique_visitors`);
    expect(mockKv.get).toHaveBeenCalledWith(`page:${pageId2}:views`);
    expect(mockKv.scard).toHaveBeenCalledWith(`page:${pageId2}:unique_visitors`);
    expect(mockKv.lrange).toHaveBeenCalledWith(`user:${userId}:credittransactions`, 0, 100);
    expect(mockKv.lrange).toHaveBeenCalledWith(`user:${userId}:notifications`, 0, 49);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      email: user.email,
      credits: user.credits,
      generatedPages: [
        {
          pageId: pageId1,
          businessName: 'Page 1',
          service: 'Plumbing',
          town: 'Dallas',
          zipCode: '75001',
          createdAt: createdAtDate.toISOString(),
          updatedAt: createdAtDate.toISOString(),
          telephone: null,
          priceRange: null,
          openingHours: null,
          enableAICopy: null,
          aiStyle: null,
          url: `/user123/plumbing-in-dallas.html`,
          views: 10,
          uniqueVisitors: 5,
          indexingStatus: 'unknown',
          lastIndexingCheck: null
        },
        {
          pageId: pageId2,
          businessName: 'Page 2',
          service: 'Cleaning',
          town: 'Houston',
          zipCode: '77001',
          createdAt: createdAtDate.toISOString(),
          updatedAt: createdAtDate.toISOString(),
          telephone: null,
          priceRange: null,
          openingHours: null,
          enableAICopy: null,
          aiStyle: null,
          url: `/user123/cleaning-in-houston.html`,
          views: 20,
          uniqueVisitors: 15,
          indexingStatus: 'unknown',
          lastIndexingCheck: null
        },
      ],
      creditTransactions: [],
      indexingNotifications: [],
      leads: [],
      isPaidUser: false,
      dailyStats: expect.any(Array),
      customDomain: null,
      customDomainRedirect: null,
      clientId: 'user123',
      webhookUrl: null,
      webhookEnabled: false,
      gaTrackingId: null,
      fbPixelId: null,
      smsEnabled: false,
      smsPhone: null
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
    mockKv.lrange.mockResolvedValue([]);

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      email: user.email,
      credits: user.credits,
      generatedPages: [],
      creditTransactions: [],
      indexingNotifications: [],
      leads: [],
      isPaidUser: false,
      dailyStats: expect.any(Array),
      customDomain: null,
      customDomainRedirect: null,
      clientId: 'user123',
      webhookUrl: null,
      webhookEnabled: false,
      gaTrackingId: null,
      fbPixelId: null,
      smsEnabled: false,
      smsPhone: null
    });
  });
});
