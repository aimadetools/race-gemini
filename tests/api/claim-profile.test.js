import { jest } from '@jest/globals';

const mockDbQuery = jest.fn();
jest.mock('../../db/index.js', () => ({
  query: (...args) => mockDbQuery(...args),
}));

jest.mock('@vercel/kv', () => ({
  kv: {
    set: jest.fn(() => Promise.resolve('OK')),
  },
}));

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(() => Promise.resolve('mock-hashed-password')),
  },
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: jest.fn(() => 'mock-jwt-token'),
  },
}));

jest.mock('cookie', () => ({
  __esModule: true,
  serialize: jest.fn(() => 'authToken=mock-jwt-token; Path=/; HttpOnly'),
}));

jest.mock('nanoid', () => ({
  __esModule: true,
  nanoid: jest.fn(() => 'mock-ref-code'),
}));

jest.mock('../../api/track.js', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

import handler from '../../api/claim-profile.js';
import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { nanoid } from 'nanoid';
import trackEventHandler from '../../api/track.js';

describe('Claim Profile API', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbQuery.mockReset();
    
    req = {
      method: 'POST',
      body: {
        slug: 'test-agency',
        email: 'test@agency.com',
        password: 'password123',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

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
    expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
  });

  test('should return 400 if fields are missing', async () => {
    req.body = { slug: 'test-agency' };
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Missing required fields: slug, email, password' });
  });

  test('should return 404 if agency listing is not found', async () => {
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    await handler(req, res);

    expect(mockDbQuery).toHaveBeenNthCalledWith(1,
      expect.stringContaining('SELECT id, name, claimed_user_id FROM agency_directory WHERE slug = $1'),
      ['test-agency']
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Agency listing not found.' });
  });

  test('should return 409 if agency listing is already claimed', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Already Claimed', claimed_user_id: 999 }],
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'This agency profile has already been claimed.' });
  });

  test('should return 409 if user account with email already exists', async () => {
    mockDbQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Agency', claimed_user_id: null }] }) // Fetch agency
      .mockResolvedValueOnce({ rows: [{ id: 999 }] }); // Existing user with email

    await handler(req, res);

    expect(mockDbQuery).toHaveBeenNthCalledWith(2,
      expect.stringContaining('SELECT id FROM users WHERE email = $1'),
      ['test@agency.com']
    );
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: 'A user account with this email already exists. Please log in first.',
    });
  });

  test('should successfully claim profile, create user, update directory, update leads, set cookie, and return 201', async () => {
    mockDbQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'My Agency', claimed_user_id: null }] }) // Fetch agency
      .mockResolvedValueOnce({ rows: [] }) // Existing user check (none)
      .mockResolvedValueOnce({ rows: [{ id: 101 }] }) // Insert user returning ID
      .mockResolvedValueOnce({ rows: [] }) // Update agency directory claimed user
      .mockResolvedValueOnce({ rows: [] }); // Update leads table

    await handler(req, res);

    // Verify password hash
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    // Verify user insertion query
    expect(mockDbQuery).toHaveBeenNthCalledWith(3,
      expect.stringContaining('INSERT INTO users'),
      ['test@agency.com', 'mock-hashed-password', 50, 'mock-ref-code', true, 'My Agency']
    );
    // Verify agency directory claimed user id update
    expect(mockDbQuery).toHaveBeenNthCalledWith(4,
      expect.stringContaining('UPDATE agency_directory SET claimed_user_id = $1 WHERE id = $2'),
      [101, 1]
    );
    // Verify leads transfer query
    expect(mockDbQuery).toHaveBeenNthCalledWith(5,
      expect.stringContaining('UPDATE leads SET user_id = $1 WHERE agency_directory_id = $2'),
      [101, 1]
    );

    // Verify JWT token signing
    expect(jwt.sign).toHaveBeenCalledWith({ userId: 101 }, 'test_secret', { expiresIn: '1h' });
    // Verify KV session storage
    expect(kv.set).toHaveBeenCalledWith(
      expect.stringContaining('session:sess_'),
      expect.stringContaining('"userId":101'),
    );
    // Verify cookie setting
    expect(serialize).toHaveBeenCalledWith('authToken', 'mock-jwt-token', expect.any(Object));
    expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.any(String));

    // Verify response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Agency profile claimed successfully!',
      userId: 101,
      agencyName: 'My Agency',
    });

    // Verify event tracking
    expect(trackEventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          eventName: 'agency_profile_claimed',
          userId: 101,
        }),
      }),
      expect.any(Object)
    );
  });

  test('should return 500 if database query fails', async () => {
    mockDbQuery.mockRejectedValueOnce(new Error('DB connection failed'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });
});
