import { jest } from '@jest/globals';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('../../lib/indexing.js', () => ({
  submitToGoogleIndexing: jest.fn(),
}));

import handler from '../../api/retry-indexing-queue.js';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { submitToGoogleIndexing } from '../../lib/indexing.js';
import { 
  clearMockUsers, 
  addMockUser, 
  addMockSeoPage, 
  clearMockSeoPages, 
  addMockIndexingRetryQueue, 
  clearMockIndexingRetryQueue,
  getMockIndexingRetryQueue
} from '../../db/mockDb.js';

describe('Retry Indexing Queue API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
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

  test('should return 200 with empty list response if queue is empty', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'No failed indexing requests in the retry queue.',
      retriedCount: 0
    }));
  });

  test('should successfully retry all queued pages and update DB states', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 1 });

    addMockUser({ id: 1 });
    addMockSeoPage({
      id: 'page_1',
      user_id: 1,
      business_name: 'Plumber',
      service: 'Plumbing',
      town: 'Austin',
      file_name: 'plumbing-in-austin.html'
    });
    addMockSeoPage({
      id: 'page_2',
      user_id: 1,
      business_name: 'Electrician',
      service: 'Electrical',
      town: 'Austin',
      file_name: 'electrical-in-austin.html'
    });

    addMockIndexingRetryQueue({
      user_id: 1,
      page_url: 'https://localseogen.com/1/plumbing-in-austin.html',
      attempts: 1
    });
    addMockIndexingRetryQueue({
      user_id: 1,
      page_url: 'https://localseogen.com/1/electrical-in-austin.html',
      attempts: 2
    });

    submitToGoogleIndexing.mockImplementation(async (userId, urls) => {
      const idx = getMockIndexingRetryQueue().findIndex(r => r.page_url === urls[0]);
      if (idx !== -1) {
        getMockIndexingRetryQueue().splice(idx, 1);
      }
      const idx2 = getMockIndexingRetryQueue().findIndex(r => r.page_url === urls[1]);
      if (idx2 !== -1) {
        getMockIndexingRetryQueue()[idx2].attempts += 1;
      }
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Successfully processed retry queue.',
      retriedCount: 2,
      succeededCount: 1,
      failedCount: 1
    }));

    expect(submitToGoogleIndexing).toHaveBeenCalledWith(1, [
      'https://localseogen.com/1/plumbing-in-austin.html',
      'https://localseogen.com/1/electrical-in-austin.html'
    ]);
  });
});
