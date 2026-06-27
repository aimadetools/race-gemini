import { jest } from '@jest/globals';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('../../lib/gsc.js', () => ({
  requestGoogleIndexing: jest.fn(),
}));

import handler from '../../api/retry-indexing-single.js';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { requestGoogleIndexing } from '../../lib/gsc.js';
import { 
  clearMockUsers, 
  addMockUser, 
  addMockSeoPage, 
  clearMockSeoPages, 
  addMockIndexingRetryQueue, 
  clearMockIndexingRetryQueue,
  getMockIndexingRetryQueue
} from '../../db/mockDb.js';

describe('Retry Indexing Single API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      body: {
        url: 'https://localseogen.com/1/plumbing-in-austin.html',
      },
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
    clearMockIndexingRetryQueue();
    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should return 405 for non-POST methods', async () => {
    req.method = 'GET';
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('should return 401 if not authenticated', async () => {
    parseCookie.mockReturnValue({});
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('should return 400 if url is missing', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });
    req.body = {};

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should return 403 if user does not own the URL and it is not in the queue', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });
    req.body.url = 'https://localseogen.com/2/plumbing-in-austin.html';
    addMockUser({ id: 1, custom_domain: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('should successfully retry and return 200 if URL is owned', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });
    requestGoogleIndexing.mockResolvedValue({ success: true, mocked: true });
    
    addMockUser({ id: 1, custom_domain: null });
    addMockSeoPage({
      id: 'page_123',
      user_id: 1,
      business_name: 'Plumber',
      service: 'Plumbing',
      town: 'Austin',
      file_name: 'plumbing-in-austin.html'
    });
    addMockIndexingRetryQueue({
      user_id: 1,
      page_url: 'https://localseogen.com/1/plumbing-in-austin.html',
      attempts: 1
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Crawl request submitted successfully.'
    }));
    expect(getMockIndexingRetryQueue().length).toBe(0);
  });

  test('should return 500 if GSC call fails', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });
    requestGoogleIndexing.mockResolvedValue({ success: false, error: 'API Error' });
    
    addMockUser({ id: 1, custom_domain: null });
    addMockIndexingRetryQueue({
      user_id: 1,
      page_url: 'https://localseogen.com/1/plumbing-in-austin.html',
      attempts: 1
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Google Indexing API submission failed.'
    }));
    expect(getMockIndexingRetryQueue().length).toBe(1);
    expect(getMockIndexingRetryQueue()[0].attempts).toBe(2);
  });
});
