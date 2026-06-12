import { jest } from '@jest/globals';

const mockDbQuery = jest.fn(() => Promise.resolve({ rows: [] }));
jest.mock('../../db/index.js', () => ({
  query: (...args) => mockDbQuery(...args),
}));

import getAgencyClaimsHandler from '../../api/get-agency-claims.js';

const createMockRes = () => {
  const res = {
    _status: 200,
    _json: {},
    _headers: {},
    status: jest.fn(function (code) {
      this._status = code;
      return this;
    }),
    json: jest.fn(function (data) {
      this._json = data;
      return this;
    }),
    setHeader: jest.fn(function (name, value) {
      this._headers[name] = value;
      return this;
    }),
    end: jest.fn(function (data) {
      this._json = data;
      return this;
    }),
  };
  return res;
};

const createMockReq = (query = {}, method = 'GET', headers = {}) => ({
  method,
  query,
  headers: {
    get: (header) => headers[header.toLowerCase()],
    ...headers,
  },
});

describe('get-agency-claims API', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbQuery.mockClear();
    mockDbQuery.mockImplementation(() => Promise.resolve({ rows: [] }));
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.MIGRATION_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.MIGRATION_SECRET;
    consoleErrorSpy.mockRestore();
  });

  it('should return 401 if MIGRATION_SECRET environment variable is not configured', async () => {
    delete process.env.MIGRATION_SECRET;
    const req = createMockReq({ secret: 'test_secret' });
    const res = createMockRes();

    await getAgencyClaimsHandler(req, res);

    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Unauthorized: MIGRATION_SECRET not configured.');
  });

  it('should return 401 if secret is incorrect', async () => {
    const req = createMockReq({ secret: 'wrong_secret' });
    const res = createMockRes();

    await getAgencyClaimsHandler(req, res);

    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Unauthorized.');
  });

  it('should return 401 if secret header is incorrect', async () => {
    const req = createMockReq({}, 'GET', { 'x-admin-secret': 'wrong_secret' });
    const res = createMockRes();

    await getAgencyClaimsHandler(req, res);

    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Unauthorized.');
  });

  it('should successfully get empty claims list if none exist', async () => {
    const req = createMockReq({ secret: 'test_secret' });
    const res = createMockRes();

    await getAgencyClaimsHandler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual([]);
  });

  it('should successfully fetch and return claims list', async () => {
    const dbClaims = [
      {
        id: 1,
        agency_name: 'Agency One',
        website: 'https://agency1.com',
        city: 'Denver',
        slug: 'agency-one',
        claimed_email: 'agency1@test.com',
        user_credits: 50,
        claimed_at: '2026-06-12T00:00:00.000Z'
      }
    ];
    mockDbQuery.mockImplementationOnce(() => Promise.resolve({ rows: dbClaims }));

    const req = createMockReq({ secret: 'test_secret' });
    const res = createMockRes();

    await getAgencyClaimsHandler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual([
      {
        id: 1,
        agencyName: 'Agency One',
        website: 'https://agency1.com',
        city: 'Denver',
        slug: 'agency-one',
        claimedEmail: 'agency1@test.com',
        userCredits: 50,
        claimedAt: '2026-06-12T00:00:00.000Z'
      }
    ]);
  });

  it('should return 500 if DB query fails', async () => {
    mockDbQuery.mockImplementationOnce(() => Promise.reject(new Error('DB Error')));
    const req = createMockReq({ secret: 'test_secret' });
    const res = createMockRes();

    await getAgencyClaimsHandler(req, res);

    expect(res._status).toBe(500);
    expect(res._json.message).toBe('Failed to fetch agency claims.');
  });

  it('should return 405 if method is not GET', async () => {
    const req = createMockReq({ secret: 'test_secret' }, 'POST');
    const res = createMockRes();

    await getAgencyClaimsHandler(req, res);

    expect(res._status).toBe(405);
  });
});
