import { jest } from '@jest/globals';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

import handler from '../../api/save-review-reply.js';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { setQueryDelegate, clearMockUsers, addMockUser } from '../../db/mockDb.js';
import { encrypt } from '../../lib/crypto-helper.js';

describe('Save Review Reply API', () => {
  let req;
  let res;
  let mockTestimonial;
  let mockUser;

  beforeEach(() => {
    req = {
      method: 'POST',
      headers: {},
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    mockTestimonial = {
      id: 101,
      user_id: 1,
      author_name: 'Alice Cooper',
      rating: 5,
      review_text: 'Excellent work by the team! Highly recommend.',
      google_review_id: 'google-r123',
      reply_text: null,
      reply_date: null
    };

    // We set env.JWT_SECRET in beforeEach, so we must encrypt after process.env.JWT_SECRET is set
    process.env.JWT_SECRET = 'test_secret';

    mockUser = {
      id: 1,
      email: 'plumber@test.com',
      gbp_oauth_refresh_token: encrypt('mock-refresh-token'),
      gbp_oauth_access_token: 'mock-access-token',
      gbp_account_id: 'acc123',
      gbp_location_id: 'loc123'
    };

    jest.clearAllMocks();
    clearMockUsers();
    addMockUser(mockUser);
    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    setQueryDelegate(null);
  });

  test('should return 401 if no token is provided', async () => {
    parseCookie.mockReturnValue({});
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
  });

  test('should return 400 if testimonial ID is missing', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });
    req.body = { replyText: 'Thank you!' }; // missing id

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Testimonial ID is required.' });
  });

  test('should return 400 if reply text is missing', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });
    req.body = { id: 101 }; // missing replyText

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Reply text is required.' });
  });

  test('should return 404 if testimonial is not found', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });
    req.body = { id: 999, replyText: 'Thank you!' };

    setQueryDelegate((text, params) => {
      if (text.includes('SELECT id, google_review_id FROM testimonials')) {
        return { rows: [] }; // not found
      }
      return null;
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Testimonial not found or unauthorized.' });
  });

  test('should save reply locally and return 200 with gbp message', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });
    req.body = { id: 101, replyText: 'Thank you, Alice!' };

    let updateCalled = false;

    setQueryDelegate((text, params) => {
      if (text.includes('SELECT id, google_review_id FROM testimonials')) {
        return { rows: [mockTestimonial] };
      }
      if (text.includes('UPDATE testimonials SET reply_text')) {
        updateCalled = true;
        mockTestimonial.reply_text = params[0];
        return { rows: [] };
      }
      if (text.includes('SELECT gbp_oauth_refresh_token')) {
        return { rows: [mockUser] };
      }
      return null;
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(responseData.syncStatus).toBe('synced');
    expect(responseData.gbpMessage).toContain('Mock mode');
    expect(updateCalled).toBe(true);
    expect(mockTestimonial.reply_text).toBe('Thank you, Alice!');
  });
});
