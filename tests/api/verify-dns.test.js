import { jest } from '@jest/globals';

const mockResolveCname = jest.fn();
const mockResolve4 = jest.fn();

jest.mock('dns', () => ({
  promises: {
    resolveCname: (...args) => mockResolveCname(...args),
    resolve4: (...args) => mockResolve4(...args),
  },
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

import handler from '../../api/verify-dns';
import dns from 'dns';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';

describe('verify-dns API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      headers: {
        cookie: 'auth=valid_token',
      },
      body: {
        domain: 'seo.mybusiness.com',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
    mockResolveCname.mockReset();
    mockResolve4.mockReset();
    cookie.parse.mockReturnValue({ auth: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: '123' });

    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should return 405 for non-POST requests', async () => {
    req.method = 'GET';
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ message: 'Only POST requests are allowed' });
  });

  test('should return 400 if no domain is provided', async () => {
    req.body = {};
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Domain name is required' });
  });

  test('should return 400 for invalid domain format', async () => {
    req.body.domain = 'invalid-domain';
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid domain format. e.g., seo.yourdomain.com' });
  });

  test('should return 401 if not authenticated', async () => {
    cookie.parse.mockReturnValue({});
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
  });

  test('should verify successfully via valid CNAME pointing to localseogen.com', async () => {
    mockResolveCname.mockResolvedValue(['localseogen.com']);

    await handler(req, res);

    expect(mockResolveCname).toHaveBeenCalledWith('seo.mybusiness.com');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      verified: true,
      method: 'CNAME'
    }));
  });

  test('should verify successfully via valid CNAME with trailing dot', async () => {
    mockResolveCname.mockResolvedValue(['localseogen.com.']);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      verified: true,
      method: 'CNAME'
    }));
  });

  test('should verify successfully via IP resolution if CNAME check fails but IPs match', async () => {
    // CNAME check fails
    mockResolveCname.mockRejectedValue(new Error('ENODATA'));
    // IP resolution matches
    mockResolve4.mockImplementation((hostname) => {
      if (hostname === 'localseogen.com') {
        return Promise.resolve(['1.2.3.4', '5.6.7.8']);
      }
      if (hostname === 'seo.mybusiness.com') {
        return Promise.resolve(['1.2.3.4']);
      }
      return Promise.reject(new Error('Unknown host'));
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      verified: true,
      method: 'A/IP'
    }));
  });

  test('should fail verification if CNAME points elsewhere and IPs do not match', async () => {
    mockResolveCname.mockResolvedValue(['otherdomain.com']);
    mockResolve4.mockImplementation((hostname) => {
      if (hostname === 'localseogen.com') {
        return Promise.resolve(['1.2.3.4']);
      }
      if (hostname === 'seo.mybusiness.com') {
        return Promise.resolve(['9.9.9.9']);
      }
      return Promise.reject(new Error('Unknown host'));
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      verified: false,
      message: expect.stringContaining('Verification failed')
    }));
  });
});
