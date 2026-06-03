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

import handler from '../../api/update-agency-branding';
import { kv } from '@vercel/kv';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { clearMockUsers, addMockUser } from '../../db/mockDb.js';

describe('update-agency-branding API', () => {
  let req;
  let res;
  let mockKv;

  beforeEach(() => {
    mockKv = {
      get: jest.fn(),
      set: jest.fn(),
    };

    req = {
      method: 'POST',
      headers: {
        cookie: 'auth=valid_token',
      },
      body: {
        logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANS',
        primaryColor: '#ff0000',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
    cookie.parse.mockReturnValue({ auth: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId: '123' });

    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should return 405 for non-POST requests', async () => {
    req.method = 'GET';
    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ message: 'Only POST requests are allowed' });
  });

  test('should return 401 if no token is provided', async () => {
    cookie.parse.mockReturnValue({});

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
  });

  test('should return 403 if not an agency account', async () => {
    jwt.verify.mockReturnValue({}); // decoded token has no userId or agencyId

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not an agency account' });
  });

  test('should return 404 if agency is not found in database', async () => {
    // No mock users added, so the update query should return 0 rows.
    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Agency not found' });
  });

  test('should update branding in DB and KV and return 200 on success', async () => {
    const mockAgency = {
      id: '123',
      email: 'agency@example.com',
      is_agency: true,
      logo_url: null,
      primary_color: null,
    };
    addMockUser(mockAgency);

    mockKv.get.mockResolvedValue({ name: 'Mock Agency', logoUrl: null, primaryColor: null });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Branding updated successfully' });

    // Verify KV interactions
    expect(mockKv.get).toHaveBeenCalledWith('agency:123');
    expect(mockKv.set).toHaveBeenCalledWith('agency:123', {
      name: 'Mock Agency',
      logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANS',
      primaryColor: '#ff0000',
    });
  });
});
