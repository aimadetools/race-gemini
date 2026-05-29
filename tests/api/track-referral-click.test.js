import { jest } from '@jest/globals';

// Mock fs for logger
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

// Mock path for logger
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn(),
}));

import handler from '../../api/track-referral-click.js';
import { setQueryDelegate } from '../../db/mockDb.js';
import fs from 'fs';
import path from 'path';

describe('api/track-referral-click', () => {
  let req;
  let res;
  let mockQuery;

  beforeEach(() => {
    mockQuery = jest.fn();
    setQueryDelegate(mockQuery);

    req = {
      method: 'POST',
      body: {},
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();

    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockReturnValue(undefined);
    fs.appendFileSync.mockReturnValue(undefined);
    path.join.mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    setQueryDelegate(null);
  });

  it('should return 405 for non-POST methods', async () => {
    req.method = 'GET';
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('should return 400 if referral code (ref) is missing', async () => {
    req.body = {}; // No ref code
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Referral code is required.' });
  });

  it('should return 404 if the referral code does not exist in DB', async () => {
    req.body = { ref: 'INVALID_REF' };
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DB returns no updated rows

    await handler(req, res);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET referral_clicks'),
      ['INVALID_REF']
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Referral code not found.' });
  });

  it('should return 200 and increment click counter on success', async () => {
    req.body = { ref: 'VALID_REF' };
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, email: 'referrer@example.com' }] });

    await handler(req, res);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET referral_clicks'),
      ['VALID_REF']
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Referral click tracked successfully.' });
  });

  it('should return 500 if database query fails', async () => {
    req.body = { ref: 'VALID_REF' };
    mockQuery.mockRejectedValueOnce(new Error('DB failure'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
  });
});
