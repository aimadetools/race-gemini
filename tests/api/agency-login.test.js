import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => {
  return {
    __esModule: true,
    default: {
      compare: jest.fn(),
    },
  };
});

jest.mock('jsonwebtoken', () => {
  return {
    __esModule: true,
    default: {
      sign: jest.fn(),
    },
  };
});

import handler from '../../api/agency-login';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


describe('agency-login API', () => {
  let req;
  let res;
  let mockKv;

  beforeEach(() => {
    mockKv = {
      get: jest.fn(),
    };

    req = {
      method: 'POST',
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  test('should return 405 for non-POST methods', async () => {
    req.method = 'GET';
    await handler(req, res, mockKv);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalledWith('Method GET Not Allowed');
  });

  test('should return 400 if email or password are missing', async () => {
    req.body = { email: 'test@example.com' }; // Missing password
    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required.' });

    jest.clearAllMocks();

    req.body = { password: 'password123' }; // Missing email
    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required.' });
  });

  test('should return 401 for non-existent agency email', async () => {
    req.body = { email: 'nonexistent@example.com', password: 'password123' };
    mockKv.get.mockResolvedValueOnce(null); // agencyId is null

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith('agency:nonexistent@example.com');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials.' });
  });

  test('should return 401 for incorrect password', async () => {
    const agencyId = 'agency123';
    const agency = {
      id: agencyId,
      email: 'test@example.com',
      passwordHash: 'hashedpasswordfromdb',
    };

    req.body = { email: 'test@example.com', password: 'wrongpassword' };
    mockKv.get
      .mockResolvedValueOnce(agencyId) // first get for agencyId
      .mockResolvedValueOnce(agency); // second get for agency object

    bcrypt.compare.mockResolvedValueOnce(false); // Incorrect password

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith('agency:test@example.com');
    expect(mockKv.get).toHaveBeenCalledWith(`agency:${agencyId}`);
    expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedpasswordfromdb');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials.' });
  });

  test('should return 500 for internal server error during KV operations', async () => {
    req.body = { email: 'test@example.com', password: 'password123' };
    mockKv.get.mockRejectedValueOnce(new Error('KV connection failed'));

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
  });

  test('should successfully log in an agency and set a cookie', async () => {
    const agencyId = 'agency123';
    const agency = {
      id: agencyId,
      email: 'test@example.com',
      passwordHash: 'hashedpasswordfromdb',
    };
    const token = 'mocked_jwt_token';

    req.body = { email: 'test@example.com', password: 'correctpassword' };
    mockKv.get
      .mockResolvedValueOnce(agencyId) // first get for agencyId
      .mockResolvedValueOnce(agency); // second get for agency object

    bcrypt.compare.mockResolvedValueOnce(true); // Correct password
    jwt.sign.mockReturnValueOnce(token);

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith('agency:test@example.com');
    expect(mockKv.get).toHaveBeenCalledWith(`agency:${agencyId}`);
    expect(bcrypt.compare).toHaveBeenCalledWith('correctpassword', 'hashedpasswordfromdb');
    expect(jwt.sign).toHaveBeenCalledWith({ agencyId: agency.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    expect(res.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining(`token=${token}`)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Agency logged in successfully!', agencyId: agency.id });
  });
});
