import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
  },
}));
import { kv } from '@vercel/kv';

import handler from '../../api/track-email-open.js';
import { setQueryDelegate, pool } from '../../db/mockDb.js';

const mockQuery = jest.fn();
const mockRelease = jest.fn();
let mockConnect;

describe('api/track-email-open', () => {
  beforeAll(() => {
    mockConnect = jest.spyOn(pool, 'connect').mockImplementation(async () => ({
      query: mockQuery,
      release: mockRelease,
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setQueryDelegate(mockQuery);
    mockQuery.mockClear();
    mockRelease.mockClear();
    mockConnect.mockClear();
    kv.get.mockReset();
  });

  afterEach(() => {
    setQueryDelegate(null);
  });

  afterAll(() => {
    mockConnect.mockRestore();
  });

  it('should return a 1x1 transparent GIF and track event when id is provided', async () => {
    const req = {
      method: 'GET',
      query: { id: 'test-message-123' },
      headers: { 'user-agent': 'Jest' },
      socket: {}
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      setHeader: jest.fn()
    };

    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, event_name: 'email_opened' }] });
    kv.get.mockResolvedValueOnce('recipient@example.com');

    await handler(req, res);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_events'),
      [
        'email_opened',
        null,
        { messageId: 'test-message-123', email: 'recipient@example.com' }
      ]
    );
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/gif');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return a 1x1 transparent GIF but not track event when id is missing', async () => {
    const req = {
      method: 'GET',
      query: {},
      headers: {},
      socket: {}
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      setHeader: jest.fn()
    };

    await handler(req, res);

    expect(mockConnect).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/gif');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
