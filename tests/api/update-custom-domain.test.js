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

import handler from '../../api/update-custom-domain';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { clearMockUsers, addMockUser, getMockUsers } from '../../db/mockDb.js';

describe('update-custom-domain API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      headers: {
        cookie: 'auth=valid_token',
      },
      body: {
        customDomain: 'seo.myplumber.com',
        customDomainRedirect: 'https://myplumber.com',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
    cookie.parse.mockReturnValue({ auth: 'valid_token' });
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
    expect(res.json).toHaveBeenCalledWith({ message: 'Only POST requests are allowed' });
  });

  test('should return 401 if no token is provided', async () => {
    cookie.parse.mockReturnValue({});

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
  });

  test('should return 400 for invalid custom domain format', async () => {
    req.body.customDomain = 'invalid-domain';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid domain format. e.g., seo.yourdomain.com' });
  });

  test('should return 400 for primary platform domains', async () => {
    req.body.customDomain = 'localseogen.com';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Cannot use primary platform domains.' });
  });

  test('should return 400 if custom domain is already taken by another user', async () => {
    // Add another user with the same custom domain
    const existingUser = {
      id: '456',
      email: 'other@example.com',
      custom_domain: 'seo.myplumber.com',
    };
    addMockUser(existingUser);

    // Current user
    const currentUser = {
      id: '123',
      email: 'current@example.com',
    };
    addMockUser(currentUser);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'This custom domain is already mapped to another account.' });
  });

  test('should return 404 if user account is not found', async () => {
    // No mock users exist
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User account not found' });
  });

  test('should update custom domain settings and return 200 on success', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      custom_domain: null,
      custom_domain_redirect: null,
    };
    addMockUser(user);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Custom domain settings updated successfully',
      customDomain: 'seo.myplumber.com',
      customDomainRedirect: 'https://myplumber.com',
    });

    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.custom_domain).toBe('seo.myplumber.com');
    expect(updatedUser.custom_domain_redirect).toBe('https://myplumber.com');
  });

  test('should allow custom domain to be set to null/empty', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      custom_domain: 'seo.myplumber.com',
      custom_domain_redirect: 'https://myplumber.com',
    };
    addMockUser(user);

    req.body.customDomain = '';
    req.body.customDomainRedirect = '';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Custom domain settings updated successfully',
      customDomain: null,
      customDomainRedirect: null,
    });

    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.custom_domain).toBeNull();
    expect(updatedUser.custom_domain_redirect).toBeNull();
  });
});
