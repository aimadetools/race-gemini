import { jest } from '@jest/globals';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mocked-jwt-token'),
}));

// Mock @vercel/kv
jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    smembers: jest.fn(),
    lpush: jest.fn(),
    ltrim: jest.fn(),
  },
}));

// Mock fs.promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  }
}));

// Mock logger.js
jest.mock('../../lib/logger.js', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

import { submitSitemapToSearchEngines, updateStaticSitemapAndPing, submitToGoogleIndexing, recordFailedIndexingRequest, removeSuccessfulIndexingRequest } from '../../lib/indexing.js';
import { promises as fs } from 'fs';
import { kv } from '@vercel/kv';
import path from 'path';
import { addMockSeoPage, clearMockSeoPages, setQueryDelegate } from '../../db/mockDb.js';

describe('Indexing Lib', () => {
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;
    process.env.DOMAIN_URL = 'https://www.testdomain.com';
    kv.smembers.mockResolvedValue([]);
    clearMockSeoPages();
  });

  afterEach(() => {
    delete global.fetch;
  });

  describe('submitSitemapToSearchEngines', () => {
    it('should submit client dynamic sitemaps to Google and Bing', async () => {
      const userId = '12345';
      const req = {
        headers: {
          host: 'testdomain.com',
        }
      };

      await submitSitemapToSearchEngines(userId, req);

      // It should ping both clean and API sitemap URLs for Google and Bing
      // 2 sitemaps * 2 search engines = 4 pings (no IndexNow because smembers resolves to empty array)
      expect(mockFetch).toHaveBeenCalledTimes(4);

      const calledUrls = mockFetch.mock.calls.map(call => call[0]);
      
      // Check for Google and Bing pings with properly encoded URLs
      expect(calledUrls).toContain(
        `https://www.google.com/ping?sitemap=${encodeURIComponent('https://testdomain.com/12345/sitemap.xml')}`
      );
      expect(calledUrls).toContain(
        `https://www.google.com/ping?sitemap=${encodeURIComponent('https://testdomain.com/api/12345/sitemap.xml')}`
      );
      expect(calledUrls).toContain(
        `https://www.bing.com/ping?sitemap=${encodeURIComponent('https://testdomain.com/12345/sitemap.xml')}`
      );
      expect(calledUrls).toContain(
        `https://www.bing.com/ping?sitemap=${encodeURIComponent('https://testdomain.com/api/12345/sitemap.xml')}`
      );
    });

    it('should submit client pages to IndexNow if domain is production and pages exist', async () => {
      const userId = '12345';
      const req = {
        headers: {
          host: 'www.localseogen.com',
        }
      };

      addMockSeoPage({ user_id: userId, service: 'Plumbing Repair', town: 'Houston', createdAt: '2026-05-29' });
      addMockSeoPage({ user_id: userId, service: 'Drain Cleaning', town: 'Houston', createdAt: '2026-05-29' });

      await submitSitemapToSearchEngines(userId, req);

      // 4 sitemap pings + 1 IndexNow bulk post = 5 fetch calls
      expect(mockFetch).toHaveBeenCalledTimes(5);

      const calledUrls = mockFetch.mock.calls.map(call => call[0]);
      expect(calledUrls).toContain('https://api.indexnow.org/indexnow');

      const indexNowCall = mockFetch.mock.calls.find(call => call[0] === 'https://api.indexnow.org/indexnow');
      expect(indexNowCall[1].method).toBe('POST');
      const payload = JSON.parse(indexNowCall[1].body);
      expect(payload.host).toBe('www.localseogen.com');
      expect(payload.key).toBe('7bf308b417de4c5bb2a4a3dfb1234567');
      expect(payload.urlList).toContain('https://www.localseogen.com/12345/plumbing-repair-in-houston.html');
      expect(payload.urlList).toContain('https://www.localseogen.com/12345/drain-cleaning-in-houston.html');
    });

    it('should skip IndexNow if host is localhost', async () => {
      const userId = '12345';
      const req = {
        headers: {
          host: 'localhost:3005',
        }
      };

      addMockSeoPage({ user_id: userId, service: 'Plumbing Repair', town: 'Houston' });

      await submitSitemapToSearchEngines(userId, req);

      // 4 pings, 0 IndexNow posts
      expect(mockFetch).toHaveBeenCalledTimes(4);
      const calledUrls = mockFetch.mock.calls.map(call => call[0]);
      expect(calledUrls).not.toContain('https://api.indexnow.org/indexnow');
    });
  });

  describe('updateStaticSitemapAndPing', () => {
    it('should update static sitemap.xml and ping search engines', async () => {
      const initialSitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://www.testdomain.com/index.html</loc>\n  </url>\n</urlset>`;
      fs.readFile.mockResolvedValue(initialSitemapContent);
      fs.writeFile.mockResolvedValue();

      const newUrls = [
        'https://www.testdomain.com/generated-seo-pages/service-in-town.html'
      ];
      const req = {
        headers: {
          host: 'testdomain.com',
        }
      };

      await updateStaticSitemapAndPing(newUrls, req);

      // Verify filesystem reads/writes
      expect(fs.readFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledTimes(1);

      const writtenContent = fs.writeFile.mock.calls[0][1];
      expect(writtenContent).toContain('<loc>https://www.testdomain.com/generated-seo-pages/service-in-town.html</loc>');
      expect(writtenContent).toContain('</urlset>');

      // Verify search engine pings (1 sitemap * 2 search engines = 2 pings)
      // IndexNow skipped because testdomain.com is not local but we mocked host as testdomain.com
      // Wait, testdomain.com is skipped if it doesn't match production host or if it includes localhost/127.0.0.1/vercel.app
      // Since testdomain.com doesn't contain localhost/127.0.0.1/vercel.app, it actually tries to call IndexNow!
      // Let's see: 2 sitemap pings + 1 IndexNow ping = 3 fetch calls.
      expect(mockFetch).toHaveBeenCalledTimes(3);

      const calledUrls = mockFetch.mock.calls.map(call => call[0]);
      expect(calledUrls).toContain(
        `https://www.google.com/ping?sitemap=${encodeURIComponent('https://testdomain.com/sitemap.xml')}`
      );
      expect(calledUrls).toContain(
        `https://www.bing.com/ping?sitemap=${encodeURIComponent('https://testdomain.com/sitemap.xml')}`
      );
      expect(calledUrls).toContain('https://api.indexnow.org/indexnow');
    });

    it('should not write to sitemap.xml if all URLs already exist', async () => {
      const initialSitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://www.testdomain.com/index.html</loc>\n  </url>\n</urlset>`;
      fs.readFile.mockResolvedValue(initialSitemapContent);

      const newUrls = [
        'https://www.testdomain.com/index.html'
      ];
      const req = {
        headers: {
          host: 'testdomain.com',
        }
      };

      await updateStaticSitemapAndPing(newUrls, req);

      expect(fs.readFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).not.toHaveBeenCalled();
      
      // Still pings the main sitemap and IndexNow (3 pings)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('submitToGoogleIndexing', () => {
    let originalEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
      delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      delete process.env.GOOGLE_CLIENT_EMAIL;
      delete process.env.GOOGLE_PRIVATE_KEY;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should skip if credentials are not configured', async () => {
      const urls = ['https://www.testdomain.com/page1.html'];
      await submitToGoogleIndexing('12345', urls);
      
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should notify error if GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON', async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON = 'invalid-json';
      const urls = ['https://www.testdomain.com/page1.html'];
      
      await submitToGoogleIndexing('12345', urls);
      
      expect(kv.lpush).toHaveBeenCalled();
      const notification = JSON.parse(kv.lpush.mock.calls[0][1]);
      expect(notification.message).toContain('Failed to parse Google Indexing credentials');
      expect(notification.status).toBe('error');
    });

    it('should successfully submit URLs when GOOGLE_SERVICE_ACCOUNT_JSON is configured', async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
        client_email: 'test@service-account.iam.gserviceaccount.com',
        private_key: 'dummy-private-key'
      });
      
      const urls = ['https://www.testdomain.com/page1.html', 'https://www.testdomain.com/page2.html'];
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'mock-access-token' })
        })
        .mockResolvedValue({
          ok: true
        });

      await submitToGoogleIndexing('12345', urls);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      const oauthCall = mockFetch.mock.calls[0];
      expect(oauthCall[0]).toBe('https://oauth2.googleapis.com/token');
      expect(oauthCall[1].method).toBe('POST');
      expect(oauthCall[1].body).toContain('assertion=mocked-jwt-token');

      const publishCall1 = mockFetch.mock.calls[1];
      expect(publishCall1[0]).toBe('https://indexing.googleapis.com/v3/urlNotifications:publish');
      expect(publishCall1[1].method).toBe('POST');
      expect(publishCall1[1].headers.Authorization).toBe('Bearer mock-access-token');
      expect(JSON.parse(publishCall1[1].body).url).toBe(urls[0]);

      expect(kv.lpush).toHaveBeenCalled();
      const notification = JSON.parse(kv.lpush.mock.calls[0][1]);
      expect(notification.message).toContain('Successfully submitted 2 pages directly to Google Indexing API');
      expect(notification.status).toBe('success');
    });

    it('should successfully submit URLs when direct email and key are configured', async () => {
      process.env.GOOGLE_CLIENT_EMAIL = 'direct@service-account.com';
      process.env.GOOGLE_PRIVATE_KEY = 'direct-private-key-with-\\n-escapes';
      
      const urls = ['https://www.testdomain.com/page1.html'];
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'direct-access-token' })
        })
        .mockResolvedValue({
          ok: true
        });

      await submitToGoogleIndexing('12345', urls);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][1].headers.Authorization).toBe('Bearer direct-access-token');
    });

    it('should handle OAuth endpoint errors gracefully', async () => {
      process.env.GOOGLE_CLIENT_EMAIL = 'direct@service-account.com';
      process.env.GOOGLE_PRIVATE_KEY = 'key';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Invalid assertion')
      });

      const urls = ['https://www.testdomain.com/page1.html'];
      await submitToGoogleIndexing('12345', urls);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(kv.lpush).toHaveBeenCalled();
      const notification = JSON.parse(kv.lpush.mock.calls[0][1]);
      expect(notification.message).toContain('Error during Google Indexing submission');
      expect(notification.status).toBe('error');
    });

    it('should handle publish API errors gracefully', async () => {
      process.env.GOOGLE_CLIENT_EMAIL = 'direct@service-account.com';
      process.env.GOOGLE_PRIVATE_KEY = 'key';
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'access-token' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          text: () => Promise.resolve('Permission denied')
        });

      const urls = ['https://www.testdomain.com/page1.html'];
      await submitToGoogleIndexing('12345', urls);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(kv.lpush).toHaveBeenCalled();
      const notification = JSON.parse(kv.lpush.mock.calls[0][1]);
      expect(notification.message).toContain('Failed to submit 1 pages to Google Indexing API');
      expect(notification.status).toBe('error');
    });
  });

  describe('indexing retry queue helpers', () => {
    let mockQueries;

    beforeEach(() => {
      mockQueries = [];
      setQueryDelegate(async (text, params) => {
        mockQueries.push({ text, params });
        return { rows: [] };
      });
    });

    afterEach(() => {
      setQueryDelegate(null);
    });

    it('should insert or update on conflict inside recordFailedIndexingRequest', async () => {
      await recordFailedIndexingRequest('12345', 'https://example.com/failed-page', 'Some inspection error');

      expect(mockQueries.length).toBe(1);
      expect(mockQueries[0].text).toContain('INSERT INTO indexing_retry_queue');
      expect(mockQueries[0].params).toEqual(['12345', 'https://example.com/failed-page', 'Some inspection error']);
    });

    it('should delete from queue inside removeSuccessfulIndexingRequest', async () => {
      await removeSuccessfulIndexingRequest('12345', 'https://example.com/success-page');

      expect(mockQueries.length).toBe(1);
      expect(mockQueries[0].text).toContain('DELETE FROM indexing_retry_queue');
      expect(mockQueries[0].params).toEqual(['12345', 'https://example.com/success-page']);
    });
  });
});
