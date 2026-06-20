import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    smembers: jest.fn(),
    scard: jest.fn(),
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
import { clearMockUsers, addMockUser, addMockSeoPage } from '../../db/mockDb.js';

describe('client-details API', () => {
  let req;
  let res;
  let mockKv;

  beforeEach(() => {
    mockKv = {
      get: jest.fn(),
      smembers: jest.fn(),
      scard: jest.fn(),
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
    clearMockUsers();

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

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Client ID is required' });
  });

  test('should return 401 if token is invalid', async () => {
    req.query.id = 'client123';
    cookie.parse.mockReturnValue({ token: 'invalid_token' });
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    await handler(req, res, mockKv);

    expect(jwt.verify).toHaveBeenCalledWith('invalid_token', 'test_secret');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authentication failed: Please log in again.' });
  });

  test('should return 403 if token does not contain userId or agencyId', async () => {
    req.query.id = 'client123';
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({});

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not an agency account' });
  });

  test('should return 404 if client not found or 403 if does not belong to agency', async () => {
    const agencyId = 'agency123';
    const clientId = 'client123';
    
    addMockUser({
      id: agencyId,
      email: 'agency@example.com',
      is_agency: true,
    });

    req.query.id = clientId;
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Client not found' });

    jest.clearAllMocks();
    addMockUser({
      id: agencyId,
      email: 'agency@example.com',
      is_agency: true,
    });
    addMockUser({
      id: clientId,
      name: 'Another Client',
      email: 'another@example.com',
      credits: 10,
      agency_id: 'different_agency',
      is_agency: false,
    });
    
    jwt.verify.mockReturnValue({ agencyId });
    cookie.parse.mockReturnValue({ token: 'valid_token' });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Client does not belong to this agency.' });
  });

  test('should successfully retrieve client details and pages', async () => {
    const agencyId = 'agency123';
    const clientId = 'client123';
    const pageId1 = 'page1';
    const pageId2 = 'page2';

    addMockUser({
      id: agencyId,
      email: 'agency@example.com',
      is_agency: true,
    });

    const client = {
      id: clientId,
      name: 'Test Client',
      email: 'client@example.com',
      credits: 200,
      agency_id: agencyId,
      is_agency: false,
    };
    addMockUser(client);

    const createdAt1 = new Date('2026-05-28T14:00:00Z');
    const createdAt2 = new Date('2026-05-28T15:00:00Z');

    addMockSeoPage({
      id: pageId1,
      user_id: clientId,
      business_name: 'Plumbers R Us',
      service: 'SEO',
      town: 'London',
      zip_code: '11111',
      created_at: createdAt1,
      telephone: undefined,
      price_range: undefined,
      opening_hours: undefined,
    });

    addMockSeoPage({
      id: pageId2,
      user_id: clientId,
      business_name: 'Plumbers R Us',
      service: 'PPC',
      town: 'Paris',
      zip_code: '22222',
      created_at: createdAt2,
      telephone: undefined,
      price_range: undefined,
      opening_hours: undefined,
    });

    req.query.id = clientId;
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });
    
    await handler(req, res, mockKv);

    expect(slugify).toHaveBeenCalledWith('SEO', { lower: true, strict: true });
    expect(slugify).toHaveBeenCalledWith('London', { lower: true, strict: true });
    expect(slugify).toHaveBeenCalledWith('PPC', { lower: true, strict: true });
    expect(slugify).toHaveBeenCalledWith('Paris', { lower: true, strict: true });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: clientId,
      name: client.name,
      email: client.email,
      credits: client.credits,
      shareToken: expect.any(String),
      pages: [
        {
          pageId: pageId1,
          businessName: 'Plumbers R Us',
          service: 'SEO',
          town: 'London',
          zipCode: '11111',
          createdAt: createdAt1.toISOString(),
          telephone: undefined,
          priceRange: undefined,
          openingHours: undefined,
          views: 0,
          uniqueVisitors: 0,
          indexingStatus: 'unknown',
          lastIndexingCheck: null,
          fileName: 'seo-in-london.html'
        },
        {
          pageId: pageId2,
          businessName: 'Plumbers R Us',
          service: 'PPC',
          town: 'Paris',
          zipCode: '22222',
          createdAt: createdAt2.toISOString(),
          telephone: undefined,
          priceRange: undefined,
          openingHours: undefined,
          views: 0,
          uniqueVisitors: 0,
          indexingStatus: 'unknown',
          lastIndexingCheck: null,
          fileName: 'ppc-in-paris.html'
        },
      ],
      leads: []
    });
  });

  test('should successfully retrieve client details, pages, and leads', async () => {
    const agencyId = 'agency123';
    const clientId = 'client123';
    const pageId1 = 'page1';

    addMockUser({
      id: agencyId,
      email: 'agency@example.com',
      is_agency: true,
    });

    const client = {
      id: clientId,
      name: 'Test Client',
      email: 'client@example.com',
      credits: 200,
      agency_id: agencyId,
      is_agency: false,
    };
    addMockUser(client);

    const createdAt1 = new Date('2026-05-28T14:00:00Z');
    const leadCreatedAt = new Date('2026-06-19T08:00:00Z');

    addMockSeoPage({
      id: pageId1,
      user_id: clientId,
      business_name: 'Plumbers R Us',
      service: 'SEO',
      town: 'London',
      zip_code: '11111',
      created_at: createdAt1,
      telephone: undefined,
      price_range: undefined,
      opening_hours: undefined,
    });

    const { addMockLead } = await import('../../db/mockDb.js');
    addMockLead({
      id: 'lead1',
      user_id: clientId,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123456789',
      message: 'Need plumbing service',
      url: 'https://localseogen.com/client123/seo-in-london.html',
      created_at: leadCreatedAt,
      is_unlocked: true,
    });

    req.query.id = clientId;
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });
    
    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: clientId,
      name: client.name,
      email: client.email,
      credits: client.credits,
      shareToken: expect.any(String),
      pages: [
        {
          pageId: pageId1,
          businessName: 'Plumbers R Us',
          service: 'SEO',
          town: 'London',
          zipCode: '11111',
          createdAt: createdAt1.toISOString(),
          telephone: undefined,
          priceRange: undefined,
          openingHours: undefined,
          views: 0,
          uniqueVisitors: 0,
          indexingStatus: 'unknown',
          lastIndexingCheck: null,
          fileName: 'seo-in-london.html'
        }
      ],
      leads: [
        {
          id: 'lead1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '123456789',
          message: 'Need plumbing service',
          url: 'https://localseogen.com/client123/seo-in-london.html',
          createdAt: leadCreatedAt.toISOString(),
          isUnlocked: true,
        }
      ]
    });
  });

  test('should return 500 for internal server error during database operations', async () => {
    const agencyId = 'agency123';
    const clientId = 'client123';
    req.query.id = clientId;
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });
    
    const { setQueryDelegate } = await import('../../db/mockDb.js');
    setQueryDelegate(() => { throw new Error('Database connection failed'); });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });

    setQueryDelegate(null);
  });
});
