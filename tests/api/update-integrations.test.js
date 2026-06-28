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

  test('should return 400 if Google Review Link has invalid URL format', async () => {
    req.body.googleReviewLink = 'not-a-valid-url';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid Google Review Link format.' });
  });

  test('should return 400 if Facebook Review URL has non http/https protocol', async () => {
    req.body.facebookReviewLink = 'ftp://facebook.com/reviews';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Facebook Review Link must use http or https protocol.' });
  });

  test('should update external review links successfully and return 200', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      google_review_link: null,
      facebook_review_link: null,
      yelp_review_link: null,
    };
    addMockUser(user);

    req.body.googleReviewLink = 'https://g.page/r/123/review';
    req.body.facebookReviewLink = 'https://facebook.com/biz/reviews';
    req.body.yelpReviewLink = 'https://yelp.com/biz/123';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.google_review_link).toBe('https://g.page/r/123/review');
    expect(updatedUser.facebook_review_link).toBe('https://facebook.com/biz/reviews');
    expect(updatedUser.yelp_review_link).toBe('https://yelp.com/biz/123');
  });

  test('should return 400 if Google GSC Verification File format is invalid', async () => {
    req.body.googleVerificationCode = 'invalid-code-123%';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid Google GSC Verification File format. Should match google[a-zA-Z0-9].html' });
  });

  test('should update google GSC verification code successfully (normalizing and saving) and return 200', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      google_verification_code: null,
    };
    addMockUser(user);

    req.body.googleVerificationCode = 'e1a2b3c4d5e6f7'; // raw code

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.google_verification_code).toBe('googlee1a2b3c4d5e6f7.html');
  });

  test('should return 400 if auto-responder subject exceeds 255 characters', async () => {
    req.body.autoResponderSubject = 'a'.repeat(256);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Auto-responder subject must be under 255 characters.' });
  });

  test('should return 400 if auto-responder message exceeds 2000 characters', async () => {
    req.body.autoResponderMessage = 'a'.repeat(2001);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Auto-responder message must be under 2000 characters.' });
  });

  test('should update auto-responder settings successfully and return 200', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      auto_responder_enabled: false,
      auto_responder_subject: null,
      auto_responder_message: null,
    };
    addMockUser(user);

    req.body.autoResponderEnabled = true;
    req.body.autoResponderSubject = 'Thanks {{lead_name}}!';
    req.body.autoResponderMessage = 'Hi {{lead_name}}, we received your message regarding {{service}} in {{town}}.';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.auto_responder_enabled).toBe(true);
    expect(updatedUser.auto_responder_subject).toBe('Thanks {{lead_name}}!');
    expect(updatedUser.auto_responder_message).toBe('Hi {{lead_name}}, we received your message regarding {{service}} in {{town}}.');
  });

  test('should update report frequency settings successfully and return 200', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      weekly_report_enabled: true,
      report_frequency: 'weekly',
    };
    addMockUser(user);

    req.body.reportFrequency = 'daily';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.report_frequency).toBe('daily');
  });
});
