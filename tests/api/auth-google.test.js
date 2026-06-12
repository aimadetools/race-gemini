import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn(),
}));

import initHandler from '../../api/auth/google/init.js';
import callbackHandler from '../../api/auth/google/callback.js';
import disconnectHandler from '../../api/auth/google/disconnect.js';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { clearMockUsers, addMockUser, getMockUsers } from '../../db/mockDb.js';

describe('Google Business Profile OAuth API endpoints', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'GET',
      headers: {
        cookie: 'authToken=valid_token',
      },
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      end: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();

    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('GET /api/auth/google/init', () => {
    test('should return 401 if not authenticated', async () => {
      cookie.parse.mockReturnValue({});
      await initHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should redirect to Google Auth URL if authenticated', async () => {
      cookie.parse.mockReturnValue({ authToken: 'valid_token' });
      jwt.verify.mockReturnValue({ userId: '123' });
      jwt.sign.mockReturnValue('mock-state-value');

      await initHandler(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(302, expect.objectContaining({
        Location: expect.stringContaining('https://accounts.google.com/o/oauth2/v2/auth')
      }));
      expect(res.writeHead).toHaveBeenCalledWith(302, expect.objectContaining({
        Location: expect.stringContaining('state=mock-state-value')
      }));
    });
  });

  describe('GET /api/auth/google/callback', () => {
    test('should return 400 if missing code or state', async () => {
      req.query = { code: 'some-code' };
      await callbackHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should successfully handle callback with mock-auth-code', async () => {
      const user = {
        id: '123',
        email: 'user@example.com',
      };
      addMockUser(user);

      req.query = { code: 'mock-auth-code', state: 'valid-state' };
      jwt.verify.mockReturnValue({ userId: '123' });

      await callbackHandler(req, res);

      expect(res.writeHead).toHaveBeenCalledWith(302, expect.objectContaining({
        Location: '/dashboard.html?gbp_connected=true'
      }));

      const updatedUser = getMockUsers().find(u => u.id === '123');
      expect(updatedUser.gbp_oauth_access_token).toBe('mock-access-token');
      expect(updatedUser.gbp_account_id).toBe('mock-account-id');
      expect(updatedUser.gbp_location_id).toBe('mock-location-id');
    });
  });

  describe('POST /api/auth/google/disconnect', () => {
    test('should return 401 if not authenticated', async () => {
      req.method = 'POST';
      cookie.parse.mockReturnValue({});
      await disconnectHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should successfully disconnect GBP and clear columns', async () => {
      const user = {
        id: '123',
        email: 'user@example.com',
        gbp_oauth_refresh_token: 'some-refresh-token',
        gbp_oauth_access_token: 'some-access-token',
        gbp_account_id: 'some-account-id',
        gbp_location_id: 'some-location-id',
        gbp_sync_enabled: true
      };
      addMockUser(user);

      req.method = 'POST';
      cookie.parse.mockReturnValue({ authToken: 'valid_token' });
      jwt.verify.mockReturnValue({ userId: '123' });

      await disconnectHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Disconnected Google Business Profile successfully.' });

      const updatedUser = getMockUsers().find(u => u.id === '123');
      expect(updatedUser.gbp_oauth_refresh_token).toBeNull();
      expect(updatedUser.gbp_oauth_access_token).toBeNull();
      expect(updatedUser.gbp_account_id).toBeNull();
      expect(updatedUser.gbp_location_id).toBeNull();
      expect(updatedUser.gbp_sync_enabled).toBe(false);
    });
  });
});
