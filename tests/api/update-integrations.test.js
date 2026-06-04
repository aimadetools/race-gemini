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

import handler from '../../api/update-integrations';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { clearMockUsers, addMockUser, getMockUsers } from '../../db/mockDb.js';

describe('update-integrations API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      headers: {
        cookie: 'auth=valid_token',
      },
      body: {
        webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/456',
        webhookEnabled: true,
        gaTrackingId: 'G-12345678',
        fbPixelId: '987654321',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn().mockReturnThis(),
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
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
  });

  test('should return 401 if no token is provided', async () => {
    cookie.parse.mockReturnValue({});

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated. Please log in.' });
  });

  test('should return 400 for invalid Webhook URL format', async () => {
    req.body.webhookUrl = 'invalid-url';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid Webhook URL format.' });
  });

  test('should return 400 if Webhook URL protocol is not http or https', async () => {
    req.body.webhookUrl = 'ftp://hooks.zapier.com';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Webhook URL must use http or https protocol.' });
  });

  test('should update integrations settings and return 200 on success', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      webhook_url: null,
      webhook_enabled: false,
      ga_tracking_id: null,
      fb_pixel_id: null,
    };
    addMockUser(user);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Integration settings updated successfully.',
    });

    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.webhook_url).toBe('https://hooks.zapier.com/hooks/catch/123/456');
    expect(updatedUser.webhook_enabled).toBe(true);
    expect(updatedUser.ga_tracking_id).toBe('G-12345678');
    expect(updatedUser.fb_pixel_id).toBe('987654321');
  });

  test('should allow fields to be set to null/empty', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      webhook_url: 'https://hooks.zapier.com/hooks/catch/123/456',
      webhook_enabled: true,
      ga_tracking_id: 'G-12345678',
      fb_pixel_id: '987654321',
    };
    addMockUser(user);

    req.body.webhookUrl = '';
    req.body.webhookEnabled = false;
    req.body.gaTrackingId = '';
    req.body.fbPixelId = '';
    req.body.smsEnabled = false;
    req.body.smsPhone = '';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.webhook_url).toBeNull();
    expect(updatedUser.webhook_enabled).toBe(false);
    expect(updatedUser.ga_tracking_id).toBeNull();
    expect(updatedUser.fb_pixel_id).toBeNull();
    expect(updatedUser.sms_enabled).toBe(false);
    expect(updatedUser.sms_phone).toBeNull();
  });

  test('should return 400 if SMS is enabled but phone number is empty', async () => {
    req.body.smsEnabled = true;
    req.body.smsPhone = '';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Phone number is required when SMS alerts are enabled.' });
  });

  test('should return 400 if SMS phone format is invalid', async () => {
    req.body.smsEnabled = true;
    req.body.smsPhone = 'abc-123-xyz';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid phone number format. Must include country code (e.g. +15551234567).' });
  });

  test('should update SMS settings and return 200 on success', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      sms_enabled: false,
      sms_phone: null,
    };
    addMockUser(user);

    req.body.smsEnabled = true;
    req.body.smsPhone = '+15551234567';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.sms_enabled).toBe(true);
    expect(updatedUser.sms_phone).toBe('+15551234567');
  });
});
