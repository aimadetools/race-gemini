import { jest } from '@jest/globals';

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

global.fetch = jest.fn();

import handler from '../../api/local-seo-grid.js';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { clearMockUsers, addMockUser, setQueryDelegate } from '../../db/mockDb.js';

describe('Local SEO Grid API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'GET',
      headers: {},
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    jest.clearAllMocks();
    jwt.verify.mockReset();
    cookie.parse.mockReset();
    clearMockUsers();
    setQueryDelegate(null);

    process.env.JWT_SECRET = 'test_secret';
    process.env.OPENCAGE_API_KEY = 'test_opencage_key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.OPENCAGE_API_KEY;
  });

  test('should return 405 for non-GET methods', async () => {
    req.method = 'POST';
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('should return 401 if not authenticated (no token or cookie)', async () => {
    cookie.parse.mockReturnValue({});
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated. Please log in.' });
  });

  test('should return 401 if JWT token verification fails', async () => {
    req.headers.cookie = 'authToken=invalid';
    cookie.parse.mockReturnValue({ authToken: 'invalid' });
    jwt.verify.mockImplementation(() => {
      throw new Error('JWT verification failed');
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token. Please log in again.' });
  });

  test('should return 200 and computed SEO grid for directly authenticated user with no business profile or coordinates', async () => {
    req.headers.cookie = 'authToken=valid';
    cookie.parse.mockReturnValue({ authToken: 'valid' });
    jwt.verify.mockReturnValue({ userId: 123 });

    // Mock DB queries
    setQueryDelegate(async (text, params) => {
      if (text.includes('SELECT town FROM users WHERE id = $1')) {
        return { rows: [{ town: 'Austin' }] };
      }
      if (text.includes('SELECT lat, lng, city, address FROM business_profile WHERE user_id = $1')) {
        return { rows: [] }; // No business profile, will use default coords
      }
      if (text.includes('SELECT town FROM seo_pages WHERE user_id = $1')) {
        return { rows: [{ town: 'Round Rock' }] };
      }
      return { rows: [] };
    });

    // Mock fetch for OpenCage and Overpass
    global.fetch.mockImplementation((url) => {
      if (url.includes('api.opencagedata.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            results: [{ geometry: { lat: 30.2672, lng: -97.7431 } }]
          })
        });
      }
      if (url.includes('overpass-api.de')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            elements: [
              { tags: { name: 'Round Rock' }, lat: 30.5083, lon: -97.6789 },
              { tags: { name: 'Pflugerville' }, lat: 30.4548, lon: -97.6223 }
            ]
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.baseCity).toBe('Austin');
    expect(responseData.grid.length).toBe(9);
    // Center cell should be CTR
    const centerCell = responseData.grid.find(c => c.direction === 'CTR');
    expect(centerCell).toBeDefined();
    expect(centerCell.name).toBe('Austin');
  });

  test('should return 404 if share token is provided but not found in DB', async () => {
    req.query.token = 'invalid_share_token';

    setQueryDelegate(async (text, params) => {
      if (text.includes('SELECT id, town FROM users WHERE share_token = $1')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Shared portal not found or expired.' });
  });

  test('should return 200 and computed SEO grid using valid share token', async () => {
    req.query.token = 'valid_share_token';

    setQueryDelegate(async (text, params) => {
      if (text.includes('SELECT id, town FROM users WHERE share_token = $1')) {
        return { rows: [{ id: 456, town: 'Miami' }] };
      }
      if (text.includes('SELECT lat, lng, city, address FROM business_profile WHERE user_id = $1')) {
        return { rows: [{ lat: 25.7617, lng: -80.1918, city: 'Miami', address: 'Miami, FL' }] };
      }
      if (text.includes('SELECT town FROM seo_pages WHERE user_id = $1')) {
        return { rows: [{ town: 'Miami Beach' }] };
      }
      return { rows: [] };
    });

    global.fetch.mockImplementation((url) => {
      if (url.includes('overpass-api.de')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            elements: [
              { tags: { name: 'Miami Beach' }, lat: 25.7907, lon: -80.1300 },
              { tags: { name: 'Coral Gables' }, lat: 25.7215, lon: -80.2684 }
            ]
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.baseCity).toBe('Miami');
    expect(responseData.grid.length).toBe(9);
  });

  test('should handle agency querying for their own client client_id', async () => {
    req.headers.cookie = 'authToken=agency_token';
    cookie.parse.mockReturnValue({ authToken: 'agency_token' });
    jwt.verify.mockReturnValue({ userId: 100 }); // Agency User ID
    req.query.clientId = '200'; // Client User ID

    setQueryDelegate(async (text, params) => {
      if (text.includes('SELECT is_agency FROM users WHERE id = $1')) {
        return { rows: [{ is_agency: true }] };
      }
      if (text.includes('SELECT id, town, agency_id FROM users WHERE id = $1')) {
        return { rows: [{ id: 200, town: 'Los Angeles', agency_id: 100 }] };
      }
      if (text.includes('SELECT lat, lng, city, address FROM business_profile WHERE user_id = $1')) {
        return { rows: [{ lat: 34.0522, lng: -118.2437, city: 'Los Angeles', address: 'Los Angeles, CA' }] };
      }
      if (text.includes('SELECT town FROM seo_pages WHERE user_id = $1')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    global.fetch.mockImplementation((url) => {
      if (url.includes('overpass-api.de')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ elements: [] }) // Empty to test fallback
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.baseCity).toBe('Los Angeles');
  });

  test('should return 403 if user is not agency but requests a clientId', async () => {
    req.headers.cookie = 'authToken=non_agency_token';
    cookie.parse.mockReturnValue({ authToken: 'non_agency_token' });
    jwt.verify.mockReturnValue({ userId: 100 });
    req.query.clientId = '200';

    setQueryDelegate(async (text, params) => {
      if (text.includes('SELECT is_agency FROM users WHERE id = $1')) {
        return { rows: [{ is_agency: false }] };
      }
      return { rows: [] };
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized.' });
  });

  test('should return 403 if client is not managed by the agency', async () => {
    req.headers.cookie = 'authToken=agency_token';
    cookie.parse.mockReturnValue({ authToken: 'agency_token' });
    jwt.verify.mockReturnValue({ userId: 100 });
    req.query.clientId = '200';

    setQueryDelegate(async (text, params) => {
      if (text.includes('SELECT is_agency FROM users WHERE id = $1')) {
        return { rows: [{ is_agency: true }] };
      }
      if (text.includes('SELECT id, town, agency_id FROM users WHERE id = $1')) {
        return { rows: [{ id: 200, town: 'Los Angeles', agency_id: 999 }] }; // Managed by agency 999, not 100
      }
      return { rows: [] };
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized.' });
  });

  test('should return 500 when database error occurs', async () => {
    req.headers.cookie = 'authToken=valid';
    cookie.parse.mockReturnValue({ authToken: 'valid' });
    jwt.verify.mockReturnValue({ userId: 123 });

    setQueryDelegate(async () => {
      throw new Error('Database connection failed');
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
  });
});
