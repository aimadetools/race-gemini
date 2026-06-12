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

jest.mock('node-fetch', () => jest.fn());

import handler from '../../api/business-profile.js';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { clearMockUsers, addMockUser, getMockUsers } from '../../db/mockDb.js';

describe('business-profile API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'GET',
      headers: {
        cookie: 'auth=valid_token',
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
    cookie.parse.mockReturnValue({ auth: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: '123' });

    process.env.JWT_SECRET = 'test_secret';
    process.env.OPENCAGE_API_KEY = 'test_key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.OPENCAGE_API_KEY;
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

  test('should return profile on successful GET', async () => {
    const userProfile = {
      name: 'Test Plumbing',
      type: 'Plumber',
      address: { streetAddress: '123 Main St' }
    };
    addMockUser({
      id: '123',
      email: 'user@example.com',
      business_profile: userProfile
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ profile: userProfile });
  });

  test('should return 400 for POST if business name is missing', async () => {
    req.method = 'POST';
    req.body = {
      type: 'Plumber',
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Business name is required' });
  });

  test('should successfully save profile and run geocoding fallback on POST', async () => {
    addMockUser({
      id: '123',
      email: 'user@example.com',
      business_profile: null
    });

    req.method = 'POST';
    req.body = {
      name: 'Plumb King',
      type: 'Plumber',
      address: {
        streetAddress: '123 Oak Ave',
        addressLocality: 'Austin',
        addressRegion: 'TX',
        postalCode: '78701',
        addressCountry: 'US'
      }
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ geometry: { lat: 30.2672, lng: -97.7431 } }]
      })
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseJson = res.json.mock.calls[0][0];
    expect(responseJson.message).toBe('Business profile updated successfully');
    expect(responseJson.profile.coordinates).toEqual({
      latitude: 30.2672,
      longitude: -97.7431
    });

    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.business_profile.name).toBe('Plumb King');
    expect(updatedUser.business_profile.coordinates).toEqual({
      latitude: 30.2672,
      longitude: -97.7431
    });
  });
});
