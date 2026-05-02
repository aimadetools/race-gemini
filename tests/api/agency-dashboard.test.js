import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    smembers: jest.fn(),
  },
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

import handler from '../../api/agency-dashboard';
import { kv } from '@vercel/kv';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';

describe('agency-dashboard API', () => {
  let req;
  let res;
  let mockKv;

  beforeEach(() => {
    mockKv = {
      get: jest.fn(),
      smembers: jest.fn(),
    };

    req = {
      method: 'GET',
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();

    // Mock process.env.JWT_SECRET for jwt.verify
    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should return 405 for non-GET methods', async () => {
    req.method = 'POST';
    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ message: 'Only GET requests are allowed' });
  });

  test('should return 401 if no token is provided', async () => {
    cookie.parse.mockReturnValue({}); // No cookie header

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
  });

  test('should return 403 if token is invalid', async () => {
    cookie.parse.mockReturnValue({ token: 'invalid_token' });
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    await handler(req, res, mockKv);

    expect(jwt.verify).toHaveBeenCalledWith('invalid_token', 'test_secret');
    expect(res.status).toHaveBeenCalledWith(500); // 500 because the error is caught in the try/catch
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });

  test('should return 403 if token does not contain agencyId', async () => {
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 'user123' }); // Missing agencyId

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not an agency account' });
  });

  test('should return 404 if agency is not found', async () => {
    const agencyId = 'agency123';
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });
    mockKv.get.mockResolvedValueOnce(null); // Agency not found

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith(`agency:${agencyId}`);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Agency not found' });
  });

  test('should successfully retrieve agency and client data', async () => {
    const agencyId = 'agency123';
    const client1Id = 'client1';
    const client2Id = 'client2';

    const agency = {
      agencyName: 'Test Agency',
      email: 'agency@example.com',
      logoUrl: 'logo.png',
      primaryColor: '#FFF',
      credits: 100,
      subscriptionStatus: 'active',
      planName: 'Premium',
      monthlyCredits: 50,
      renewalDate: '2026-06-01',
    };

    const client1 = { id: client1Id, name: 'Client One', email: 'client1@example.com', credits: 10 };
    const client2 = { id: client2Id, name: 'Client Two', email: 'client2@example.com', credits: 20 };

    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });
    mockKv.get.mockResolvedValueOnce(agency); // Get agency
    mockKv.smembers.mockResolvedValueOnce([client1Id, client2Id]); // Get client IDs
    mockKv.get.mockResolvedValueOnce(client1); // Get client 1
    mockKv.smembers.mockResolvedValueOnce(['page1', 'page2']); // Get client 1 pages
    mockKv.get.mockResolvedValueOnce(client2); // Get client 2
    mockKv.smembers.mockResolvedValueOnce(['page3']); // Get client 2 pages

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith(`agency:${agencyId}`);
    expect(mockKv.smembers).toHaveBeenCalledWith(`agency:${agencyId}:clients`);
    expect(mockKv.get).toHaveBeenCalledWith(`user:${client1Id}`);
    expect(mockKv.smembers).toHaveBeenCalledWith(`user:${client1Id}:pages`);
    expect(mockKv.get).toHaveBeenCalledWith(`user:${client2Id}`);
    expect(mockKv.smembers).toHaveBeenCalledWith(`user:${client2Id}:pages`);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      agencyName: agency.agencyName,
      email: agency.email,
      clients: [
        { id: client1Id, name: client1.name, email: client1.email, pagesGenerated: 2, credits: 10 },
        { id: client2Id, name: client2.name, email: client2.email, pagesGenerated: 1, credits: 20 },
      ],
      logoUrl: agency.logoUrl,
      primaryColor: agency.primaryColor,
      credits: agency.credits,
      subscriptionStatus: agency.subscriptionStatus,
      planName: agency.planName,
      monthlyCredits: agency.monthlyCredits,
      renewalDate: agency.renewalDate,
      totalClients: 2,
      totalPagesGenerated: 3,
    });
  });

  test('should return 500 for internal server error during KV operations', async () => {
    const agencyId = 'agency123';
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });
    mockKv.get.mockRejectedValueOnce(new Error('KV connection failed'));

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });

  test('should return 500 for internal server error during JWT verification', async () => {
    cookie.parse.mockReturnValue({ token: 'invalid_token' });
    jwt.verify.mockImplementation(() => { throw new Error('JWT verification failed'); });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });
});
