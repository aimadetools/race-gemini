import { jest } from '@jest/globals';

jest.mock('../../lib/indexing.js', () => ({
  submitToGoogleIndexing: jest.fn(),
}));

import handler from '../../api/cron-indexing-retry.js';
import { submitToGoogleIndexing } from '../../lib/indexing.js';
import { setQueryDelegate } from '../../db/mockDb.js';

describe('Cron Indexing Retry API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };

    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test_cron_secret';
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    setQueryDelegate(null);
  });

  test('should return 405 for non-POST methods', async () => {
    req.method = 'GET';
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('should return 401 if unauthorized', async () => {
    req.headers.authorization = 'Bearer invalid_secret';
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('should return 200 with message if queue is empty', async () => {
    req.headers.authorization = 'Bearer test_cron_secret';
    setQueryDelegate(async (text, params) => {
      if (text.includes('indexing_retry_queue')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'No failed indexing requests in the retry queue.',
      retriedCount: 0
    }));
  });

  test('should process failed requests and call submitToGoogleIndexing grouped by user', async () => {
    req.headers.authorization = 'Bearer test_cron_secret';
    const mockRows = [
      { user_id: 1, page_url: 'https://example.com/page1' },
      { user_id: 1, page_url: 'https://example.com/page2' },
      { user_id: 2, page_url: 'https://example.com/page3' },
    ];

    setQueryDelegate(async (text, params) => {
      if (text.includes('indexing_retry_queue')) {
        return { rows: mockRows };
      }
      return { rows: [] };
    });

    submitToGoogleIndexing.mockResolvedValue();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      retriedCount: 3,
      usersProcessed: 2
    }));

    expect(submitToGoogleIndexing).toHaveBeenCalledTimes(2);
    expect(submitToGoogleIndexing).toHaveBeenCalledWith('1', ['https://example.com/page1', 'https://example.com/page2']);
    expect(submitToGoogleIndexing).toHaveBeenCalledWith('2', ['https://example.com/page3']);
  });
});
