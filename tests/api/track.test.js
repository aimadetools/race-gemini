// tests/api/track.test.js
import handler from '../../api/track';
import { Pool } from 'pg'; // Import Pool for type hinting and mocking

// Mock the connectToDatabase module
jest.mock('../../lib/db', () => ({
  connectToDatabase: jest.fn(),
}));

// Mock the actual pg Pool for controlled behavior in tests
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn(() => ({
  query: mockQuery,
  release: mockRelease,
}));
const mockPool = {
  connect: mockConnect,
  query: mockQuery, // Also mock pool.query directly for cases where it might be used
};

// Before each test, reset mocks
beforeEach(() => {
  jest.clearAllMocks();
  const { connectToDatabase } = require('../../lib/db');
  connectToDatabase.mockResolvedValue(mockPool);
});

describe('api/track', () => {
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
      `
      INSERT INTO user_events(event_name, user_id, event_data)
      VALUES($1, $2, $3)
      RETURNING *;
    `,
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
      `
      INSERT INTO user_events(event_name, user_id, event_data)
      VALUES($1, $2, $3)
      RETURNING *;
    `,
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
      `
      INSERT INTO user_events(event_name, user_id, event_data)
      VALUES($1, $2, $3)
      RETURNING *;
    `,
      ['error_event', 'user456', null]
    );
    expect(mockRelease).toHaveBeenCalledTimes(1); // client.release should still be called
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
  });
});
