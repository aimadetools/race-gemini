import { jest } from '@jest/globals';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

import handler from '../../api/generate-review-reply.js';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { clearMockUsers, addMockUser, addMockSeoPage } from '../../db/mockDb.js';

describe('Generate Review Reply API', () => {
  let req;
  let res;

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

    jest.clearAllMocks();
    clearMockUsers();
    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should return 401 if no token is provided', async () => {
    parseCookie.mockReturnValue({});
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
  });

  test('should return 401 if token is invalid or expired', async () => {
    parseCookie.mockReturnValue({ authToken: 'invalid_token' });
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
  });

  test('should return 400 if rating is missing', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });
    req.body = { reviewText: 'Good job!' }; // missing rating

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Review rating is required.' });
  });

  test('should return 200 and generate positive review replies', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });
    
    // Add mock user with business profile
    const mockUser = {
      id: 1,
      email: 'plumber@test.com',
      phone: '123-456-7890',
      business_profile: {
        name: 'Plumbing Experts LLC',
        address: {
          addressLocality: 'Chicago'
        }
      }
    };
    addMockUser(mockUser);
    
    addMockSeoPage({
      id: 10,
      user_id: 1,
      business_name: 'Plumbing Experts LLC',
      service: 'plumbing',
      town: 'Chicago'
    });

    req.body = {
      reviewText: 'Great service, highly recommend!',
      rating: 5,
      authorName: 'John Cooper'
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.replies).toHaveLength(3);
    expect(responseData.replies[0].id).toBe('professional');
    expect(responseData.replies[0].text).toContain('Plumbing Experts LLC');
    expect(responseData.replies[0].text).toContain('plumbing');
    expect(responseData.replies[0].text).toContain('Chicago');
  });

  test('should return 200 and generate negative review replies', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });
    
    const mockUser = {
      id: 1,
      email: 'plumber@test.com',
      phone: '123-456-7890',
      business_profile: {
        name: 'Plumbing Experts LLC',
        phone: '123-456-7890',
        address: {
          addressLocality: 'Chicago'
        }
      }
    };
    addMockUser(mockUser);

    addMockSeoPage({
      id: 10,
      user_id: 1,
      business_name: 'Plumbing Experts LLC',
      service: 'plumbing',
      town: 'Chicago'
    });

    req.body = {
      reviewText: 'The plumber was late and did not fix the leak.',
      rating: 2,
      authorName: 'Disgruntled Client'
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.replies).toHaveLength(3);
    expect(responseData.replies[0].id).toBe('recovery');
    expect(responseData.replies[0].text).toContain('123-456-7890');
    expect(responseData.replies[0].text).toContain('plumber@test.com');
  });
});
