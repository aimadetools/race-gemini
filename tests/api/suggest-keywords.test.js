import { jest } from '@jest/globals';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

import handler from '../../api/suggest-keywords.js';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';

describe('Suggest Keywords API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      body: {
        service: 'Roofing',
        town: 'Austin'
      },
      headers: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
    };

    jest.clearAllMocks();
  });

  test('should return 405 for non-POST methods', async () => {
    req.method = 'GET';
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('should return 401 if no token is provided', async () => {
    parseCookie.mockReturnValue({});
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('should return 400 if required fields are missing', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });
    req.body = { service: 'Roofing' }; // town is missing

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should return fallback keywords if Gemini is not configured', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });
    
    // Ensure no Gemini Key in env
    delete process.env.GEMINI_API_KEY;

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.source).toBe('fallback');
    expect(responseData.keywords.length).toBeGreaterThan(0);
    expect(responseData.keywords[0].query).toContain('Roofing');
    expect(responseData.keywords[0].query).toContain('Austin');
  });
});
