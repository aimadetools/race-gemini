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

import handler from '../../api/update-local-announcement';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { clearMockUsers, addMockUser, getMockUsers } from '../../db/mockDb.js';

describe('update-local-announcement API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      headers: {
        cookie: 'auth=valid_token',
      },
      body: {
        announcementText: 'Winter pipe freeze special! Get 15% off.',
        announcementType: 'offer',
        announcementCouponCode: 'WINTER15',
        expiresDays: '7',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
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
    expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
  });

  test('should return 401 if no token is provided', async () => {
    cookie.parse.mockReturnValue({});

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authorization required. Please log in.' });
  });

  test('should return 400 if announcement text is too long', async () => {
    req.body.announcementText = 'a'.repeat(1001);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Announcement text must be under 1000 characters.' });
  });

  test('should successfully update and publish local announcement', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      announcement_text: null,
    };
    addMockUser(user);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Local update published successfully!',
      announcement: expect.objectContaining({
        text: 'Winter pipe freeze special! Get 15% off.',
        type: 'offer',
        couponCode: 'WINTER15',
      }),
    });

    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.announcement_text).toBe('Winter pipe freeze special! Get 15% off.');
    expect(updatedUser.announcement_type).toBe('offer');
    expect(updatedUser.announcement_coupon_code).toBe('WINTER15');
    expect(updatedUser.announcement_expires_at).toBeInstanceOf(Date);
  });

  test('should return 404 if user account is not found', async () => {
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found.' });
  });
});
