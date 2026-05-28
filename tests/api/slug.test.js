import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    smembers: jest.fn(),
  },
}));

jest.mock('slugify', () => jest.fn((text) => text.toLowerCase().replace(/\s/g, '-')));

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('<html>{{businessName}} {{service}} {{town}} {{metaDescription}} {{primaryColor}} {{agencyLogo}} {{ai_content}} {{localBusinessSchema}}</html>'),
}));

import handler from '../../api/[[...slug]].js';
import { kv } from '@vercel/kv';
import slugify from 'slugify';
import fs from 'fs';
import { clearMockUsers, addMockUser } from '../../db/mockDb.js';

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

    const page1 = { service: 'Plumbing', town: 'London', createdAt: '2026-05-28T14:00:00Z' };
    const page2 = { service: 'Heating', town: 'Paris', createdAt: '2026-05-28T15:00:00Z' };

    mockKv.smembers.mockResolvedValueOnce(['pageId1', 'pageId2']);
    mockKv.get.mockImplementation((key) => {
      if (key === 'pageId1') return Promise.resolve(JSON.stringify(page1));
      if (key === 'pageId2') return Promise.resolve(JSON.stringify(page2));
      return Promise.resolve(null);
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

    const pageData = {
      businessName: 'Plumbers R Us',
      service: 'Plumbing',
      town: 'London',
      createdAt: '2026-05-28T14:00:00Z',
    };

    mockKv.smembers.mockResolvedValueOnce(['pageId1']);
    mockKv.get.mockImplementation((key) => {
      if (key === 'pageId1') return Promise.resolve(JSON.stringify(pageData));
      return Promise.resolve(null);
    });

    await handler(req, res, mockKv);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Plumbers R Us'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Plumbing'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('London'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('#ff5500'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('<img src="https://logo.com/agency.png"'));
  });

  test('should return 404 if specific page is not found for client', async () => {
    const clientId = 'client123';
    req.query.slug = [clientId, 'different-in-town.html'];

    addMockUser({
      id: clientId,
      email: 'client@example.com',
      is_agency: false,
    });

    const pageData = {
      businessName: 'Plumbers R Us',
      service: 'Plumbing',
      town: 'London',
    };

    mockKv.smembers.mockResolvedValueOnce(['pageId1']);
    mockKv.get.mockResolvedValueOnce(JSON.stringify(pageData));

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
