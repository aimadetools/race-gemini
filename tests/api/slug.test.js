import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    smembers: jest.fn(),
  },
}));

jest.mock('slugify', () => jest.fn((text) => text.toLowerCase().replace(/\s/g, '-')));

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('<html>{{businessName}} {{service}} {{town}} {{metaDescription}} {{ogDescription}} {{twitterDescription}} {{primaryColor}} {{agencyLogo}} {{ai_content}} {{localBusinessSchema}}</html>'),
}));

import handler from '../../api/[[...slug]].js';
import { kv } from '@vercel/kv';
import slugify from 'slugify';
import fs from 'fs';
import { clearMockUsers, addMockUser, addMockSeoPage } from '../../db/mockDb.js';

describe('[[...slug]] API Wildcard Route', () => {
  let req;
  let res;
  let mockKv;

  beforeEach(() => {
    mockKv = {
      get: jest.fn(),
      smembers: jest.fn(),
    };

    req = {
      method: 'GET',
      headers: {
        host: 'localhost:3000',
      },
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
  });

  test('should return 404 if slug is not provided or invalid length', async () => {
    req.query.slug = null;
    await handler(req, res, mockKv);
    expect(res.status).toHaveBeenCalledWith(404);

    req.query.slug = ['client123'];
    await handler(req, res, mockKv);
    expect(res.status).toHaveBeenCalledWith(404);

    req.query.slug = ['client123', 'page', 'extra'];
    await handler(req, res, mockKv);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('should return 404 if client does not exist in DB', async () => {
    req.query.slug = ['client123', 'plumbing-in-london.html'];
    await handler(req, res, mockKv);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('should generate and serve sitemap.xml correctly', async () => {
    const clientId = 'client123';
    req.query.slug = [clientId, 'sitemap.xml'];

    addMockUser({
      id: clientId,
      email: 'client@example.com',
      is_agency: false,
    });

    addMockSeoPage({
      id: 'page1',
      user_id: clientId,
      service: 'Plumbing',
      town: 'London',
      file_name: 'plumbing-in-london.html',
      created_at: new Date('2026-05-28T14:00:00Z'),
    });

    addMockSeoPage({
      id: 'page2',
      user_id: clientId,
      service: 'Heating',
      town: 'Paris',
      file_name: 'heating-in-paris.html',
      created_at: new Date('2026-05-28T15:00:00Z'),
    });

    await handler(req, res, mockKv);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/xml');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000/client123/plumbing-in-london.html'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000/client123/heating-in-paris.html'));
  });

  test('should render dynamic client page with correct substitutions', async () => {
    const clientId = 'client123';
    req.query.slug = [clientId, 'plumbing-in-london.html'];

    addMockUser({
      id: clientId,
      name: 'Test Client',
      email: 'client@example.com',
      is_agency: false,
      agency_id: 'agency123',
    });

    // Mock agency branding
    addMockUser({
      id: 'agency123',
      name: 'Super Agency',
      email: 'agency@example.com',
      is_agency: true,
      logo_url: 'https://logo.com/agency.png',
      primary_color: '#ff5500',
    });

    addMockSeoPage({
      id: 'page1',
      user_id: clientId,
      business_name: 'Plumbers R Us',
      service: 'Plumbing',
      town: 'London',
      file_name: 'plumbing-in-london.html',
      created_at: new Date('2026-05-28T14:00:00Z'),
    });

    await handler(req, res, mockKv);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Plumbers R Us'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Plumbing'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('London'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('#ff5500'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('<img src="https://logo.com/agency.png"'));
  });

  test('should dynamically parse meta descriptions and AI copy from pageRow.content using cheerio', async () => {
    const clientId = 'client123';
    req.query.slug = [clientId, 'plumbing-in-london.html'];

    addMockUser({
      id: clientId,
      name: 'Test Client',
      email: 'client@example.com',
      is_agency: false,
    });

    addMockSeoPage({
      id: 'page1',
      user_id: clientId,
      business_name: 'Plumbers R Us',
      service: 'Plumbing',
      town: 'London',
      file_name: 'plumbing-in-london.html',
      content: `
        <html>
        <head>
          <meta name="description" content="Custom Meta Description Here"/>
          <meta property="og:description" content="Custom OG Description Here"/>
          <meta name="twitter:description" content="Custom Twitter Description Here"/>
        </head>
        <body>
          <section class="container main-content">
            <h2>Reliable Plumbing Services in London</h2>
            <p>This is Custom AI copy generated for Plumbers R Us.</p>
          </section>
        </body>
        </html>
      `,
    });

    await handler(req, res, mockKv);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Custom Meta Description Here'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Custom OG Description Here'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Custom Twitter Description Here'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('<p>This is Custom AI copy generated for Plumbers R Us.</p>'));
  });

  test('should return 404 if specific page is not found for client', async () => {
    const clientId = 'client123';
    req.query.slug = [clientId, 'different-in-town.html'];

    addMockUser({
      id: clientId,
      email: 'client@example.com',
      is_agency: false,
    });

    addMockSeoPage({
      id: 'page1',
      user_id: 'different_user',
      business_name: 'Plumbers R Us',
      service: 'Plumbing',
      town: 'London',
      file_name: 'plumbing-in-london.html',
    });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
