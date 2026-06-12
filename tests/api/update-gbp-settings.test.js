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
}));

import handler from '../../api/update-gbp-settings';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { clearMockUsers, addMockUser, getMockUsers } from '../../db/mockDb.js';

describe('update-gbp-settings API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      headers: {
        cookie: 'authToken=valid_token',
      },
      body: {
        gbpSyncEnabled: true,
        gbpPlaceId: 'ChIJN1t_tDeuEmsRUsoyG83RYdc',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
    cookie.parse.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: '123' });

    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should return 405 for non-POST requests', async () => {
    req.method = 'GET';
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
  });

  test('should return 401 if no token is provided', async () => {
    cookie.parse.mockReturnValue({});

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated. Please log in.' });
  });

  test('should update settings successfully', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      gbp_sync_enabled: false,
      gbp_place_id: null,
    };
    addMockUser(user);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Google Business Profile sync settings updated successfully.',
      settings: {
        gbpSyncEnabled: true,
        gbpPlaceId: 'ChIJN1t_tDeuEmsRUsoyG83RYdc',
      },
    });

    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.gbp_sync_enabled).toBe(true);
    expect(updatedUser.gbp_place_id).toBe('ChIJN1t_tDeuEmsRUsoyG83RYdc');
  });

  test('should return 404 if user is not found', async () => {
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found.' });
  });
});
