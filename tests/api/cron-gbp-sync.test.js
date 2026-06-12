import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

import handler from '../../api/cron-gbp-sync';
import { 
  clearMockUsers, 
  addMockUser, 
  getMockUsers,
  clearMockTestimonials,
  getMockTestimonials,
  clearMockSeoPages
} from '../../db/mockDb.js';

describe('cron-gbp-sync API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer test_cron_secret',
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

    process.env.CRON_SECRET = 'test_cron_secret';
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  test('should return 405 for non-POST requests', async () => {
    req.method = 'GET';
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
  });

  test('should return 401 if cron secret is invalid', async () => {
    req.headers.authorization = 'Bearer wrong_secret';
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  test('should run sync successfully for users with GBP sync enabled', async () => {
    // User 1: Enabled + Configured
    addMockUser({
      id: '1',
      email: 'user1@example.com',
      gbp_sync_enabled: true,
      google_review_link: 'https://g.page/r/user1/review',
      gbp_place_id: null,
      gbp_last_synced_at: null,
    });

    // User 2: Enabled but not configured (should be skipped/failed)
    addMockUser({
      id: '2',
      email: 'user2@example.com',
      gbp_sync_enabled: true,
      google_review_link: null,
      gbp_place_id: null,
      gbp_last_synced_at: null,
    });

    // User 3: Configured but disabled (should be ignored)
    addMockUser({
      id: '3',
      email: 'user3@example.com',
      gbp_sync_enabled: false,
      google_review_link: 'https://g.page/r/user3/review',
      gbp_place_id: null,
      gbp_last_synced_at: null,
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Automated Google Business Profile reviews sync completed.',
      usersChecked: 2,       // User 1 and User 2
      reviewsSynced: 5,      // User 1 should sync 5 reviews
      failedUsers: 1         // User 2 fails/skipped because no location info
    });

    // Testimonials should contain 5 reviews (all for User 1)
    const testimonials = getMockTestimonials();
    expect(testimonials.length).toBe(5);
    expect(testimonials.every(t => t.user_id === '1')).toBe(true);

    // Verify User 1 synced timestamp is updated, User 3 is not
    const updatedUsers = getMockUsers();
    expect(updatedUsers.find(u => u.id === '1').gbp_last_synced_at).toBeInstanceOf(Date);
    expect(updatedUsers.find(u => u.id === '3').gbp_last_synced_at).toBeNull();
  });
});
