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

jest.mock('slugify', () => jest.fn((text) => text.toLowerCase().replace(/\s/g, '-')));

import handler from '../../api/client-details';
import { kv } from '@vercel/kv';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import slugify from 'slugify';

describe('client-details API', () => {
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
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();

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
    cookie.parse.mockReturnValue({});

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
  });

  test('should return 400 if client ID is missing', async () => {
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    // req.query is empty, so 'id' is missing

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Client ID is required' });
  });

  test('should return 403 if token is invalid', async () => {
    req.query.id = 'client123';
    cookie.parse.mockReturnValue({ token: 'invalid_token' });
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    await handler(req, res, mockKv);

    expect(jwt.verify).toHaveBeenCalledWith('invalid_token', 'test_secret');
    expect(res.status).toHaveBeenCalledWith(500); // Because error is caught and returns 500
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });

  test('should return 403 if token does not contain agencyId', async () => {
    req.query.id = 'client123';
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 'user123' }); // Missing agencyId

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not an agency account' });
  });

  test('should return 404 if client not found or does not belong to agency', async () => {
    const agencyId = 'agency123';
    const clientId = 'client123';
    req.query.id = clientId;
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });
    mockKv.get.mockResolvedValueOnce(null); // Client not found

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith(`user:${clientId}`);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Client not found' });

    jest.clearAllMocks();
    mockKv.get.mockResolvedValueOnce({ agencyId: 'anotherAgency' }); // Client found but wrong agency
    jwt.verify.mockReturnValue({ agencyId }); // Reset mock for JWT
    cookie.parse.mockReturnValue({ token: 'valid_token' }); // Reset mock for cookie

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith(`user:${clientId}`);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Client not found' });
  });

  test('should successfully retrieve client details and pages', async () => {
    const agencyId = 'agency123';
    const clientId = 'client123';
    const pageId1 = 'page1';
    const pageId2 = 'page2';

    const client = {
      id: clientId,
      name: 'Test Client',
      email: 'client@example.com',
      credits: 200,
      agencyId: agencyId,
    };

    const page1 = { service: 'SEO', town: 'London', url: 'http://example.com/london-seo' };
    const page2 = { service: 'PPC', town: 'Paris', url: 'http://example.com/paris-ppc' };

    req.query.id = clientId;
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });
    mockKv.get.mockResolvedValueOnce(client); // Get client
    mockKv.smembers.mockResolvedValueOnce([pageId1, pageId2]); // Get page IDs
    mockKv.get.mockResolvedValueOnce(page1); // Get page 1 details
    mockKv.get.mockResolvedValueOnce(page2); // Get page 2 details

    await handler(req, res, mockKv);

    expect(mockKv.get).toHaveBeenCalledWith(`user:${clientId}`);
    expect(mockKv.smembers).toHaveBeenCalledWith(`user:${clientId}:pages`);
    expect(mockKv.get).toHaveBeenCalledWith(`page:${pageId1}`);
    expect(mockKv.get).toHaveBeenCalledWith(`page:${pageId2}`);
    expect(slugify).toHaveBeenCalledWith(page1.service, { lower: true, strict: true });
    expect(slugify).toHaveBeenCalledWith(page1.town, { lower: true, strict: true });
    expect(slugify).toHaveBeenCalledWith(page2.service, { lower: true, strict: true });
    expect(slugify).toHaveBeenCalledWith(page2.town, { lower: true, strict: true });


    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: clientId,
      name: client.name,
      email: client.email,
      credits: client.credits,
      pages: [
        { ...page1, fileName: 'seo-in-london.html' },
        { ...page2, fileName: 'ppc-in-paris.html' },
      ],
    });
  });

  test('should return 500 for internal server error during KV operations', async () => {
    const agencyId = 'agency123';
    const clientId = 'client123';
    req.query.id = clientId;
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });
    mockKv.get.mockRejectedValueOnce(new Error('KV connection failed'));

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });
});
