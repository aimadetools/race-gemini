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

import handler from '../../api/silo-settings.js';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { clearMockUsers, addMockUser, getMockUsers, clearMockSeoPages, addMockSeoPage } from '../../db/mockDb.js';

describe('silo-settings API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'GET',
      headers: {
        cookie: 'authToken=valid_token',
      },
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn(),
      setHeader: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
    clearMockSeoPages();
    cookie.parse.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: '123' });

    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should return 401 if no token is provided', async () => {
    cookie.parse.mockReturnValue({});

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
  });

  test('should return 401 if token verification fails', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
  });

  test('should return 404 for GET when user does not exist', async () => {
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User profile not found' });
  });

  test('should return silo settings and pages list on successful GET', async () => {
    addMockUser({
      id: '123',
      email: 'user@example.com',
      silo_type: 'loop',
      silo_limit: 8
    });

    addMockSeoPage({
      id: 1,
      user_id: '123',
      service: 'Plumber',
      town: 'Austin'
    });

    addMockSeoPage({
      id: 2,
      user_id: '123',
      service: 'Plumber',
      town: 'Dallas'
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      siloType: 'loop',
      siloLimit: 8,
      pages: [
        { id: 1, service: 'Plumber', town: 'Austin', user_id: '123' },
        { id: 2, service: 'Plumber', town: 'Dallas', user_id: '123' }
      ]
    });
  });

  test('should return default silo configurations if none stored', async () => {
    addMockUser({
      id: '123',
      email: 'user@example.com',
      // silo_type and silo_limit are undefined (should fallback to default)
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseJson = res.json.mock.calls[0][0];
    expect(responseJson.siloType).toBe('proximity');
    expect(responseJson.siloLimit).toBe(5);
  });

  test('should return 400 for POST if siloType is invalid', async () => {
    req.method = 'POST';
    req.body = {
      siloType: 'invalid_type',
      siloLimit: 5
    };

    addMockUser({
      id: '123',
      email: 'user@example.com',
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid silo type' });
  });

  test('should return 400 for POST if siloLimit is not a valid integer', async () => {
    req.method = 'POST';
    req.body = {
      siloType: 'proximity',
      siloLimit: 'invalid_limit'
    };

    addMockUser({
      id: '123',
      email: 'user@example.com',
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Silo link limit must be an integer between 1 and 20' });
  });

  test('should return 400 for POST if siloLimit is out of range', async () => {
    req.method = 'POST';
    req.body = {
      siloType: 'proximity',
      siloLimit: 25 // max is 20
    };

    addMockUser({
      id: '123',
      email: 'user@example.com',
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Silo link limit must be an integer between 1 and 20' });
  });

  test('should successfully save silo settings on POST', async () => {
    addMockUser({
      id: '123',
      email: 'user@example.com',
      silo_type: 'proximity',
      silo_limit: 5
    });

    req.method = 'POST';
    req.body = {
      siloType: 'loop',
      siloLimit: 10
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Internal SEO link silo configurations saved successfully!',
      siloType: 'loop',
      siloLimit: 10
    });

    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.silo_type).toBe('loop');
    expect(updatedUser.silo_limit).toBe(10);
  });
});
