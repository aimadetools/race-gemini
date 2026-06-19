import { jest } from '@jest/globals';

const mockDbQuery = jest.fn();
jest.mock('../../db/index.js', () => ({
  query: (...args) => mockDbQuery(...args),
}));

import handler from '../../api/agency-profile.js';

describe('Agency Profile API', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbQuery.mockReset();
    
    req = {
      method: 'GET',
      query: {
        slug: 'test-agency',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      setHeader: jest.fn(),
    };
  });

  test('should return 405 for non-GET methods', async () => {
    req.method = 'POST';
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith('<h1>Method Not Allowed</h1>');
  });

  test('should return 400 if slug is missing', async () => {
    req.query = {};
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('<h1>Error: Missing agency slug</h1>');
  });

  test('should return 404 if agency is not found', async () => {
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    await handler(req, res);

    expect(mockDbQuery).toHaveBeenNthCalledWith(1,
      expect.stringContaining('SELECT id, name, website, contact_name, email, personalization, city, slug, claimed_user_id FROM agency_directory WHERE slug = $1'),
      ['test-agency']
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Agency Profile Not Found'));
  });

  test('should return 200 and unclaimed profile html if agency exists and is unclaimed', async () => {
    const mockAgency = {
      id: 1,
      name: 'Unclaimed Test Agency',
      website: 'https://unclaimedagency.com',
      contact_name: 'Contact John',
      email: 'john@unclaimedagency.com',
      personalization: 'Serving Seattle with top B2B SEO.',
      city: 'Seattle',
      slug: 'test-agency',
      claimed_user_id: null,
    };

    mockDbQuery
      .mockResolvedValueOnce({ rows: [mockAgency] }) // Fetch agency
      .mockResolvedValueOnce({ rows: [{ count: '5' }] }); // Fetch leads count

    await handler(req, res);

    expect(mockDbQuery).toHaveBeenNthCalledWith(1,
      expect.stringContaining('SELECT id, name, website, contact_name, email, personalization, city, slug, claimed_user_id FROM agency_directory WHERE slug = $1'),
      ['test-agency']
    );
    expect(mockDbQuery).toHaveBeenNthCalledWith(2,
      expect.stringContaining('SELECT COUNT(*) FROM leads WHERE agency_directory_id = $1'),
      [1]
    );

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
    expect(res.status).toHaveBeenCalledWith(200);
    
    const sendCalls = res.send.mock.calls;
    expect(sendCalls.length).toBe(1);
    const html = sendCalls[0][0];
    
    expect(html).toContain('Unclaimed Test Agency');
    expect(html).toContain('Unclaimed Profile');
    expect(html).toContain('5 pending client lead inquiries');
    expect(html).toContain('Claim Profile');
  });

  test('should return 200 and claimed profile html if agency exists and is claimed', async () => {
    const mockAgency = {
      id: 2,
      name: 'Claimed Test Agency',
      website: 'https://claimedagency.com',
      contact_name: 'Contact Sarah',
      email: 'sarah@claimedagency.com',
      personalization: 'Serving Boston SEO specialists.',
      city: 'Boston',
      slug: 'test-agency',
      claimed_user_id: 100,
    };

    mockDbQuery
      .mockResolvedValueOnce({ rows: [mockAgency] }) // Fetch agency
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // Fetch leads count

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
    expect(res.status).toHaveBeenCalledWith(200);
    
    const sendCalls = res.send.mock.calls;
    expect(sendCalls.length).toBe(1);
    const html = sendCalls[0][0];
    
    expect(html).toContain('Claimed Test Agency');
    expect(html).toContain('Claimed &amp; Verified Partner');
    expect(html).not.toContain('pending client lead inquiries');
    expect(html).not.toContain('Claim Profile');
  });

  test('should return 500 if database query fails', async () => {
    mockDbQuery.mockRejectedValueOnce(new Error('Database error'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send.mock.calls[0][0]).toContain('Internal Server Error');
  });
});
