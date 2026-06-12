import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

import handler from '../../api/sync-gbp-reviews';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { 
  clearMockUsers, 
  addMockUser, 
  getMockUsers,
  clearMockTestimonials,
  getMockTestimonials,
  clearMockSeoPages,
  addMockSeoPage
} from '../../db/mockDb.js';

describe('sync-gbp-reviews API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      headers: {
        cookie: 'authToken=valid_token',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
    clearMockTestimonials();
    clearMockSeoPages();

    cookie.parse.mockReturnValue({ authToken: 'valid_token' });
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
    expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
  });

  test('should return 401 if no token is provided', async () => {
    cookie.parse.mockReturnValue({});

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated. Please log in.' });
  });

  test('should return 400 if user has no Google Review Link or Place ID configured', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      google_review_link: null,
      gbp_place_id: null,
    };
    addMockUser(user);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Google Business Profile location is not configured. Please set a Google Review Link or Place ID/Location Search Term first.'
    });
  });

  test('should successfully sync reviews when configured', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      google_review_link: 'https://g.page/r/someplace/review',
      gbp_place_id: null,
      gbp_sync_enabled: true,
      gbp_last_synced_at: null,
    };
    addMockUser(user);

    // Add a generated SEO page to mock business name & service
    addMockSeoPage({
      id: 'page1',
      user_id: '123',
      business_name: 'Super Plumbers Chicago',
      service: 'plumbing services',
      town: 'Chicago',
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const mockResData = res.json.mock.calls[0][0];
    expect(mockResData.message).toContain('Reviews synced successfully!');
    expect(mockResData.syncedCount).toBe(5);
    expect(mockResData.testimonials.length).toBe(5);

    // Verify testimonials are saved in the mock database
    const testimonials = getMockTestimonials();
    expect(testimonials.length).toBe(5);
    expect(testimonials[0].author_name).toBe('John Thompson');
    expect(testimonials[0].rating).toBe(5);
    expect(testimonials[0].review_text).toContain('Super Plumbers Chicago');
    expect(testimonials[0].review_text).toContain('plumbing services');

    // Verify last synced timestamp is updated on the user object
    const updatedUser = getMockUsers().find(u => u.id === '123');
    expect(updatedUser.gbp_last_synced_at).toBeInstanceOf(Date);
  });

  test('should successfully sync reviews via Google Business Profile OAuth', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      google_review_link: null,
      gbp_place_id: null,
      gbp_sync_enabled: true,
      gbp_last_synced_at: null,
      gbp_oauth_refresh_token: 'mock-refresh-token',
      gbp_oauth_access_token: 'mock-access-token',
      gbp_oauth_token_expires_at: new Date(Date.now() + 3600 * 1000),
      gbp_account_id: 'mock-account-id',
      gbp_location_id: 'mock-location-id',
    };
    addMockUser(user);

    addMockSeoPage({
      id: 'page1',
      user_id: '123',
      business_name: 'Super Plumbers Chicago',
      service: 'plumbing services',
      town: 'Chicago',
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const mockResData = res.json.mock.calls[0][0];
    expect(mockResData.message).toContain('Reviews synced successfully!');
    expect(mockResData.syncedCount).toBe(2);
    expect(mockResData.testimonials.length).toBe(2);

    const testimonials = getMockTestimonials();
    expect(testimonials.length).toBe(2);
    expect(testimonials[0].author_name).toBe('Alice Cooper');
    expect(testimonials[0].rating).toBe(5);
    expect(testimonials[0].review_text).toContain('Super Plumbers Chicago');
  });

  test('should not duplicate reviews on consecutive syncs', async () => {
    const user = {
      id: '123',
      email: 'user@example.com',
      google_review_link: null,
      gbp_place_id: 'some-place-id',
      gbp_sync_enabled: true,
      gbp_last_synced_at: null,
    };
    addMockUser(user);

    addMockSeoPage({
      id: 'page1',
      user_id: '123',
      business_name: 'Cleaners NY',
      service: 'carpet cleaning',
      town: 'New York',
    });

    // Run first sync
    await handler(req, res);
    expect(getMockTestimonials().length).toBe(5);

    // Run second sync
    res.json.mockClear();
    await handler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    const mockResData = res.json.mock.calls[0][0];
    expect(mockResData.syncedCount).toBe(0);
    expect(getMockTestimonials().length).toBe(5); // Still 5, no duplicates!
  });
});
