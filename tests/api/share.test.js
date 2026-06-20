import { jest } from '@jest/globals';

// Mock Vercel KV
jest.mock('@vercel/kv', () => ({
  __esModule: true,
  kv: {
    get: jest.fn(),
    smembers: jest.fn(),
    scard: jest.fn(),
  },
}));


import handler from '../../api/share.js';
import { kv } from '@vercel/kv';
import { clearMockUsers, addMockUser, addMockSeoPage, addMockLead, addMockKeywordRanking, clearMockSeoPages, clearMockLeads, clearMockKeywordRankings } from '../../db/mockDb.js';

describe('Share API', () => {
  let req;
  let res;
  let mockKv;

  beforeEach(() => {
    mockKv = {
      get: jest.fn(),
      smembers: jest.fn(),
      scard: jest.fn(),
    };

    req = {
      method: 'GET',
      headers: {},
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
    clearMockSeoPages();
    clearMockLeads();
    clearMockKeywordRankings();
  });

  test('should return 405 for non-GET methods', async () => {
    req.method = 'POST';
    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ message: 'Only GET requests are allowed' });
  });

  test('should return 400 if token query param is missing', async () => {
    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Share token is required' });
  });

  test('should return 404 if no user has matching share_token', async () => {
    req.query.token = 'nonexistent_token';
    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Shared portal not found or link has expired.' });
  });

  test('should return client details, agency branding, pages, leads, and rankings on success', async () => {
    // 1. Setup mock agency
    const agencyId = 'agency123';
    const clientId = 'client123';

    // 1. Setup mock agency
    addMockUser({
      id: agencyId,
      email: 'agency@example.com',
      is_agency: true,
      name: 'Super SEO Agency',
      logo_url: 'https://example.com/logo.png',
      primary_color: '#ff0000',
    });

    // 2. Setup mock client
    addMockUser({
      id: clientId,
      email: 'client@example.com',
      is_agency: false,
      name: 'Local Plumber LLC',
      agency_id: agencyId,
      share_token: 'valid_share_token_123',
    });

    // 3. Add mock pages, leads, rankings
    addMockSeoPage({
      id: 'page1',
      user_id: clientId,
      business_name: 'Local Plumber LLC',
      service: 'Drain Cleaning',
      town: 'Boston',
      file_name: 'drain-cleaning-in-boston.html',
    });

    addMockLead({
      id: 'lead1',
      user_id: clientId,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-0199',
      message: 'Need drain cleaning',
      is_unlocked: true,
      created_at: new Date(),
    });

    addMockKeywordRanking({
      id: 'rank1',
      user_id: clientId,
      keyword: 'best plumber Boston',
      town: 'Boston',
      service: 'Plumbing',
      rank: 4,
      previous_rank: 6,
      last_checked: new Date(),
    });

    mockKv.get.mockResolvedValue(150); // 150 page views
    mockKv.scard.mockResolvedValue(45); // 45 unique visitors

    req.query.token = 'valid_share_token_123';

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];

    expect(responseData).toBeDefined();
    expect(responseData.clientId).toBe(clientId);
    expect(responseData.clientName).toBe('Local Plumber LLC');
    expect(responseData.agencyName).toBe('Super SEO Agency');
    expect(responseData.logoUrl).toBe('https://example.com/logo.png');
    expect(responseData.primaryColor).toBe('#ff0000');
    
    // Pages assertion
    expect(responseData.pages).toHaveLength(1);
    expect(responseData.pages[0].service).toBe('Drain Cleaning');
    expect(responseData.pages[0].views).toBe(150);
    expect(responseData.pages[0].uniqueVisitors).toBe(45);

    // Leads assertion
    expect(responseData.leads).toHaveLength(1);
    expect(responseData.leads[0].name).toBe('John Doe');

    // Rankings assertion
    expect(responseData.rankings).toHaveLength(1);
    expect(responseData.rankings[0].keyword).toBe('best plumber Boston');
    expect(responseData.rankings[0].rank).toBeDefined();
    expect(responseData.rankings[0].history).toHaveLength(7);
  });
});
