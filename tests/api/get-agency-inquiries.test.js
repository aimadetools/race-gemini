import { jest } from '@jest/globals';

// Mock the db/index.js module to use our mockDbQuery
const mockDbQuery = jest.fn(() => Promise.resolve({ rows: [] }));
jest.mock('../../db/index.js', () => ({
  query: (...args) => mockDbQuery(...args),
}));

import getAgencyInquiriesHandler from '../../api/get-agency-inquiries.js';

// Mock KV store for in-memory testing
const mockKvStore = new Map();

const mockKv = {
  async *scanIterator({ match }) {
    for (const key of mockKvStore.keys()) {
      if (key.startsWith('agency-inquiry:')) {
        yield key;
      }
    }
  },
  async mget(...keys) {
    return keys.map(key => mockKvStore.get(key));
  },
};

// Helper to create mock response object
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

// Helper to create mock request object
const createMockReq = (query = {}, method = 'GET', headers = {}) => ({
  method,
  query,
  headers: {
    get: (header) => headers[header.toLowerCase()],
    ...headers,
  },
});

describe('get-agency-inquiries API', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockKvStore.clear();
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

    await getAgencyInquiriesHandler(req, res, mockKv);

    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Unauthorized: MIGRATION_SECRET not configured.');
  });

  it('should return 401 if secret is incorrect', async () => {
    const req = createMockReq({ secret: 'wrong_secret' });
    const res = createMockRes();

    await getAgencyInquiriesHandler(req, res, mockKv);

    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Unauthorized.');
  });

  it('should return 401 if secret header is incorrect', async () => {
    const req = createMockReq({}, 'GET', { 'x-admin-secret': 'wrong_secret' });
    const res = createMockRes();

    await getAgencyInquiriesHandler(req, res, mockKv);

    expect(res._status).toBe(401);
    expect(res._json.message).toBe('Unauthorized.');
  });

  it('should successfully get empty inquiries list if none exist', async () => {
    const req = createMockReq({ secret: 'test_secret' });
    const res = createMockRes();

    await getAgencyInquiriesHandler(req, res, mockKv);

    expect(res._status).toBe(200);
    expect(res._json).toEqual([]);
  });

  it('should successfully fetch, parse, and return inquiries', async () => {
    const inquiry1 = { id: '1', agencyName: 'Agency One', contactEmail: 'agency1@test.com' };
    const inquiry2 = { id: '2', agencyName: 'Agency Two', contactEmail: 'agency2@test.com' };
    
    mockKvStore.set('agency-inquiry:1', JSON.stringify(inquiry1));
    mockKvStore.set('agency-inquiry:2', JSON.stringify(inquiry2));

    const req = createMockReq({ secret: 'test_secret' });
    const res = createMockRes();

    await getAgencyInquiriesHandler(req, res, mockKv);

    expect(res._status).toBe(200);
    expect(res._json).toEqual(expect.arrayContaining([inquiry1, inquiry2]));
    expect(res._json.length).toBe(2);
  });

  it('should return 500 if KV retrieval fails', async () => {
    mockDbQuery.mockImplementationOnce(() => Promise.reject(new Error('DB Error')));
    const brokenKv = {
      async *scanIterator() {
        throw new Error('KV Error');
      },
    };
    const req = createMockReq({ secret: 'test_secret' });
    const res = createMockRes();
    await getAgencyInquiriesHandler(req, res, brokenKv);
    expect(res._status).toBe(500);
    expect(res._json.message).toBe('Failed to fetch agency inquiries.');
  });

  it('should return 405 if method is not GET', async () => {
    const req = createMockReq({ secret: 'test_secret' }, 'POST');
    const res = createMockRes();

    await getAgencyInquiriesHandler(req, res, mockKv);

    expect(res._status).toBe(405);
  });
});
