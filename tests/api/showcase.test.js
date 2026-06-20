import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

import handler from '../../api/showcase.js';
import { clearMockUsers, addMockUser, clearMockSeoPages, addMockSeoPage } from '../../db/mockDb.js';

describe('showcase API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'GET',
      query: {
        limit: '12',
        offset: '0'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn(),
      setHeader: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
    clearMockSeoPages();
  });

  test('should return 405 for unsupported HTTP methods', async () => {
    req.method = 'POST';

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
  });

  test('should return 400 for invalid limit or offset parameters', async () => {
    req.query.limit = 'invalid';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);

    req.query.limit = '12';
    req.query.offset = '-5';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should return list of pages and filter values successfully', async () => {
    addMockUser({
      id: 1,
      email: 'user1@example.com',
      custom_domain: 'brand1.com'
    });

    addMockUser({
      id: 2,
      email: 'user2@example.com'
    });

    addMockSeoPage({
      id: 'page1',
      user_id: 1,
      business_name: 'Seattle Plumbing Pro',
      service: 'Plumbing',
      town: 'Seattle',
      created_at: new Date('2026-06-01T00:00:00Z'),
      primary_color: '#ff0000'
    });

    addMockSeoPage({
      id: 'page2',
      user_id: 2,
      business_name: 'Sparkle Cleaning Austin',
      service: 'Cleaning',
      town: 'Austin',
      created_at: new Date('2026-06-02T00:00:00Z'),
      primary_color: '#00ff00'
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseJson = res.json.mock.calls[0][0];
    expect(responseJson.pages.length).toBe(2);
    
    // page2 should be first since it is newer (ordered by created_at DESC)
    expect(responseJson.pages[0].businessName).toBe('Sparkle Cleaning Austin');
    expect(responseJson.pages[0].url).toBe('/2/cleaning-in-austin.html'); // No custom domain
    
    expect(responseJson.pages[1].businessName).toBe('Seattle Plumbing Pro');
    expect(responseJson.pages[1].url).toBe('https://brand1.com/plumbing-in-seattle.html'); // Has custom domain
    
    expect(responseJson.totalCount).toBe(2);
    expect(responseJson.towns).toContain('Seattle');
    expect(responseJson.towns).toContain('Austin');
    expect(responseJson.services).toContain('Plumbing');
    expect(responseJson.services).toContain('Cleaning');
  });

  test('should filter results by service and town', async () => {
    addMockUser({
      id: 1,
      email: 'user1@example.com'
    });

    addMockSeoPage({
      id: 'page1',
      user_id: 1,
      business_name: 'Seattle Plumbing Pro',
      service: 'Plumbing',
      town: 'Seattle',
      created_at: new Date('2026-06-01T00:00:00Z')
    });

    addMockSeoPage({
      id: 'page2',
      user_id: 1,
      business_name: 'Austin Cleaning Pro',
      service: 'Cleaning',
      town: 'Austin',
      created_at: new Date('2026-06-02T00:00:00Z')
    });

    req.query.service = 'Plumbing';
    await handler(req, res);

    let responseJson = res.json.mock.calls[0][0];
    expect(responseJson.pages.length).toBe(1);
    expect(responseJson.pages[0].businessName).toBe('Seattle Plumbing Pro');

    // Reset mocks and search by town
    res.json.mockClear();
    req.query.service = '';
    req.query.town = 'Austin';
    await handler(req, res);

    responseJson = res.json.mock.calls[0][0];
    expect(responseJson.pages.length).toBe(1);
    expect(responseJson.pages[0].businessName).toBe('Austin Cleaning Pro');
  });

  test('should perform full text search on business_name, service, and town', async () => {
    addMockUser({
      id: 1,
      email: 'user1@example.com'
    });

    addMockSeoPage({
      id: 'page1',
      user_id: 1,
      business_name: 'Super Plumbing Pro',
      service: 'Plumbing',
      town: 'Seattle',
      created_at: new Date('2026-06-01T00:00:00Z')
    });

    req.query.search = 'super';
    await handler(req, res);

    let responseJson = res.json.mock.calls[0][0];
    expect(responseJson.pages.length).toBe(1);
    expect(responseJson.pages[0].businessName).toBe('Super Plumbing Pro');
  });
});
