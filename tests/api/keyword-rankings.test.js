import { jest } from '@jest/globals';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

import handler from '../../api/keyword-rankings';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import {
  clearMockUsers,
  addMockUser,
  addMockSeoPage,
  clearMockSeoPages,
  getMockKeywordRankings,
  addMockKeywordRanking,
  clearMockKeywordRankings
} from '../../db/mockDb.js';

describe('Keyword Rankings API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'GET',
      body: {},
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
    clearMockSeoPages();
    clearMockKeywordRankings();
    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should return 401 if no auth token is provided', async () => {
    parseCookie.mockReturnValue({});
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  test('should return 401 if token validation fails', async () => {
    parseCookie.mockReturnValue({ authToken: 'invalid_token' });
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid JWT');
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('should return rankings list and auto-populate default keywords from seo pages if empty', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });

    addMockUser({ id: 1, email: 'client@example.com' });
    addMockSeoPage({
      id: 'page_123',
      user_id: 1,
      business_name: 'Super Plumber',
      service: 'Plumbing',
      town: 'Austin',
      zip_code: '78701'
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      rankings: expect.any(Array)
    }));

    const mockRankings = getMockKeywordRankings();
    expect(mockRankings.length).toBeGreaterThan(0);
    expect(mockRankings[0].user_id).toBe('1');
    expect(mockRankings[0].town).toBe('Austin');
    expect(mockRankings[0].service).toBe('Plumbing');
  });

  test('should return existing rankings if they exist in database', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });

    addMockUser({ id: 1, email: 'client@example.com' });
    addMockKeywordRanking({
      id: 'rank_999',
      user_id: '1',
      keyword: 'emergency plumber Austin',
      town: 'Austin',
      service: 'Plumbing',
      rank: 5,
      previous_rank: 6,
      last_checked: new Date(),
      created_at: new Date()
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const rankings = res.json.mock.calls[0][0].rankings;
    expect(rankings.length).toBe(1);
    expect(rankings[0].keyword).toBe('emergency plumber Austin');
  });

  test('should add a new keyword to track on POST', async () => {
    req.method = 'POST';
    req.body = {
      keyword: 'best hvac tech',
      town: 'Miami',
      service: 'HVAC'
    };

    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Keyword added successfully for rank tracking.'
    }));

    const mockRankings = getMockKeywordRankings();
    expect(mockRankings.length).toBe(1);
    expect(mockRankings[0].keyword).toBe('best hvac tech');
    expect(mockRankings[0].town).toBe('Miami');
  });

  test('should return 400 if adding a duplicate keyword on POST', async () => {
    req.method = 'POST';
    req.body = {
      keyword: 'best hvac tech',
      town: 'Miami',
      service: 'HVAC'
    };

    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });

    addMockKeywordRanking({
      id: 'rank_1',
      user_id: '1',
      keyword: 'best hvac tech',
      town: 'Miami',
      service: 'HVAC'
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'This keyword is already being tracked for this location.'
    }));
  });

  test('should remove keyword tracking on DELETE', async () => {
    req.method = 'DELETE';
    req.body = {
      rankingId: 'rank_123'
    };

    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });

    addMockKeywordRanking({
      id: 'rank_123',
      user_id: '1',
      keyword: 'best plumber',
      town: 'Austin',
      service: 'Plumbing'
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Keyword ranking tracking removed successfully.'
    }));

    const mockRankings = getMockKeywordRankings();
    expect(mockRankings.length).toBe(0);
  });
});
