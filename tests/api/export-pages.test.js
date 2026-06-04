import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    scard: jest.fn(),
  },
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

import handler from '../../api/export-pages';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { clearMockUsers, addMockUser, setQueryDelegate } from '../../db/mockDb.js';

describe('Export Pages API', () => {
  let req;
  let res;
  let mockKv;

  beforeEach(() => {
    mockKv = {
      get: jest.fn(),
      scard: jest.fn(),
    };

    req = {
      method: 'GET',
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
    setQueryDelegate(null);
    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should return 405 for non-GET methods', async () => {
    req.method = 'POST';
    await handler(req, res, mockKv);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('should return 401 if no token is provided', async () => {
    parseCookie.mockReturnValue({});
    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated. Please log in.' });
  });

  test('should return 401 if token is invalid', async () => {
    parseCookie.mockReturnValue({ authToken: 'invalid_token' });
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('should return 200 and CSV with relative/default paths for standard users', async () => {
    const userId = 123;
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });

    const mockUser = {
      id: userId,
      email: 'user@example.com',
      custom_domain: null
    };
    addMockUser(mockUser);

    mockKv.get.mockResolvedValue(120); // 120 views
    mockKv.scard.mockResolvedValue(45); // 45 unique visitors

    setQueryDelegate((text, params) => {
      const textLower = text.toLowerCase();
      if (textLower.includes('select id, business_name, service, town, zip_code, created_at, telephone, price_range, opening_hours')) {
        return {
          rows: [
            {
              id: 999,
              business_name: 'Super Plumber',
              service: 'Emergency Plumbing',
              town: 'Boston',
              zip_code: '02108',
              telephone: '123-456-7890',
              price_range: '$$',
              opening_hours: 'Mo-Fr 08:00-18:00',
              created_at: new Date('2026-06-04T10:00:00Z')
            }
          ]
        };
      }
      if (textLower.includes('select custom_domain from users')) {
        return {
          rows: [mockUser]
        };
      }
      return { rows: [] };
    });

    await handler(req, res, mockKv);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=localleads-generated-pages.csv');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Business Name,Service,Town,Zip Code,Telephone,Price Range,Opening Hours,Views,Unique Visitors,Relative Path,Full Link,Date Created'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Super Plumber,Emergency Plumbing,Boston,02108,123-456-7890,$$,Mo-Fr 08:00-18:00,120,45,/123/emergency-plumbing-in-boston.html,https://localseogen.com/123/emergency-plumbing-in-boston.html,2026-06-04T10:00:00.000Z'));
  });

  test('should return 200 and CSV with custom domain paths for users with mapped domains', async () => {
    const userId = 123;
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId });

    const mockUser = {
      id: userId,
      email: 'user@example.com',
      custom_domain: 'seo.myplumbingcompany.com'
    };
    addMockUser(mockUser);

    mockKv.get.mockResolvedValue(10); 
    mockKv.scard.mockResolvedValue(5); 

    setQueryDelegate((text, params) => {
      const textLower = text.toLowerCase();
      if (textLower.includes('select id, business_name, service, town, zip_code, created_at, telephone, price_range, opening_hours')) {
        return {
          rows: [
            {
              id: 999,
              business_name: 'Plumbing Pro',
              service: 'Plumbing Repair',
              town: 'Austin',
              zip_code: '78701',
              telephone: '512-555-0199',
              price_range: '$$$',
              opening_hours: '24/7',
              created_at: new Date('2026-06-04T11:00:00Z')
            }
          ]
        };
      }
      if (textLower.includes('select custom_domain from users')) {
        return {
          rows: [mockUser]
        };
      }
      return { rows: [] };
    });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Plumbing Pro,Plumbing Repair,Austin,78701,512-555-0199,$$$,24/7,10,5,/123/plumbing-repair-in-austin.html,https://seo.myplumbingcompany.com/plumbing-repair-in-austin.html,2026-06-04T11:00:00.000Z'));
  });
});
