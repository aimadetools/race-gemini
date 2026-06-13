import { jest } from '@jest/globals';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('../../lib/gbp-helper.js', () => ({
  getValidAccessToken: jest.fn(),
}));

import handler from '../../api/publish-gbp-post.js';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { getValidAccessToken } from '../../lib/gbp-helper.js';
import { clearMockUsers, addMockUser } from '../../db/mockDb.js';

describe('Publish GBP Post API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      body: {
        text: 'This is a mock GBP local post update!',
      },
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should return 405 for non-POST methods', async () => {
    req.method = 'GET';
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('should return 401 if no token is provided', async () => {
    parseCookie.mockReturnValue({});
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('should return 400 if post text is missing', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: '123' });
    req.body = { text: '' };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Post content text is required.' });
  });

  test('should return 400 if user has not connected Google Business Profile', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: '123' });
    
    // User without GBP tokens
    addMockUser({
      id: '123',
      email: 'user@example.com',
      gbp_oauth_refresh_token: null,
      gbp_oauth_access_token: null,
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Google Business Profile is not connected. Please connect it in settings.' });
  });

  test('should successfully simulate post publication with mock access tokens', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: '123' });
    getValidAccessToken.mockResolvedValue('mock-access-token');

    addMockUser({
      id: '123',
      email: 'user@example.com',
      gbp_oauth_refresh_token: 'mock-refresh-token',
      gbp_oauth_access_token: 'mock-access-token',
      gbp_account_id: 'mock-account-id',
      gbp_location_id: 'mock-location-id',
      custom_domain: 'mybusiness.com',
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Update successfully published to your Google Business Profile listing!',
      mock: true,
      post: {
        summary: 'This is a mock GBP local post update!',
        ctaUrl: 'https://mybusiness.com',
      },
    });
    expect(getValidAccessToken).toHaveBeenCalled();
  });
});
