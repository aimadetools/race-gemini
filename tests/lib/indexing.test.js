import { jest } from '@jest/globals';

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

import { submitSitemapToSearchEngines, updateStaticSitemapAndPing } from '../../lib/indexing.js';
import { promises as fs } from 'fs';
import { kv } from '@vercel/kv';
import path from 'path';

describe('Indexing Lib', () => {
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;
    process.env.DOMAIN_URL = 'https://www.testdomain.com';
    kv.smembers.mockResolvedValue([]);
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

      kv.smembers.mockResolvedValue(['page1', 'page2']);
      kv.get.mockImplementation(async (key) => {
        if (key === 'page1') {
          return JSON.stringify({ service: 'Plumbing Repair', town: 'Houston', createdAt: '2026-05-29' });
        }
        if (key === 'page2') {
          return JSON.stringify({ service: 'Drain Cleaning', town: 'Houston', createdAt: '2026-05-29' });
        }
        return null;
      });

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

      kv.smembers.mockResolvedValue(['page1']);
      kv.get.mockResolvedValue(JSON.stringify({ service: 'Plumbing Repair', town: 'Houston' }));

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
});
