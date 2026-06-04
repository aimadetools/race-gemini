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

import handler from '../../api/test-webhook';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';

describe('test-webhook API', () => {
  let req;
  let res;
  let originalFetch;

  beforeEach(() => {
    req = {
      method: 'POST',
      headers: {
        cookie: 'auth=valid_token',
      },
      body: {
        webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/456',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
    cookie.parse.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: '123' });

    process.env.JWT_SECRET = 'test_secret';

    // Mock global fetch
    originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    globalThis.fetch = originalFetch;
  });

  test('should return 405 for non-POST requests', async () => {
    req.method = 'GET';
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
  });

  test('should return 401 if no token is provided', async () => {
    cookie.parse.mockReturnValue({});

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('should return 400 for missing Webhook URL', async () => {
    req.body.webhookUrl = '';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Missing Webhook URL.' });
  });

  test('should return 400 for invalid Webhook URL format', async () => {
    req.body.webhookUrl = 'invalid-url';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should send test payload and return 200 on successful response', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    });

    await handler(req, res);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://hooks.zapier.com/hooks/catch/123/456',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Webhook triggered successfully! Server returned status: 200 OK',
    });
  });

  test('should return 400 on custom server error response', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: jest.fn().mockResolvedValue('Fatal Server Error details'),
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Webhook failed: Server returned status 500 Internal Server Error. Response: Fatal Server Error details',
    });
  });

  test('should return 400 if fetch call throws an exception', async () => {
    globalThis.fetch.mockRejectedValue(new Error('DNS Lookup failed'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Connection failed: Could not connect to Webhook URL. Details: DNS Lookup failed',
    });
  });
});
