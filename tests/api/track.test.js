import { jest } from '@jest/globals';
import handler from '../../api/track.js';
import { setQueryDelegate, pool } from '../../db/mockDb.js';

const mockQuery = jest.fn();
const mockRelease = jest.fn();
let mockConnect;

describe('api/track', () => {
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
  });

  afterEach(() => {
    setQueryDelegate(null);
  });

  afterAll(() => {
    mockConnect.mockRestore();
  });

  it('should return 405 for non-POST requests', async () => {
    const req = { method: 'GET' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
  });

  it('should return 400 if eventName is missing', async () => {
    const req = { method: 'POST', body: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'eventName is required.' });
  });

  it('should successfully track an event with all parameters', async () => {
    const req = {
      method: 'POST',
      body: {
        eventName: 'button_click',
        userId: 'user123',
        eventData: { buttonId: 'submitBtn', page: '/pricing.html' },
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, event_name: 'button_click' }] });

    await handler(req, res);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_events'),
      ['button_click', 'user123', { buttonId: 'submitBtn', page: '/pricing.html' }]
    );
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event tracked successfully.' });
  });

  it('should successfully track an event with only eventName', async () => {
    const req = {
      method: 'POST',
      body: {
        eventName: 'page_view',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, event_name: 'page_view' }] });

    await handler(req, res);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_events'),
      ['page_view', null, null]
    );
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event tracked successfully.' });
  });

  it('should handle database errors gracefully', async () => {
    const req = {
      method: 'POST',
      body: {
        eventName: 'error_event',
        userId: 'user456',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const databaseError = new Error('Database connection failed');
    mockQuery.mockRejectedValueOnce(databaseError);

    await handler(req, res);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_events'),
      ['error_event', 'user456', null]
    );
    expect(mockRelease).toHaveBeenCalledTimes(1); // client.release should still be called
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
  });
});
