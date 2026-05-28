import { jest } from '@jest/globals';
import { submitSitemapToSearchEngines, updateStaticSitemapAndPing } from '../../lib/indexing.js';
import { promises as fs } from 'fs';
import path from 'path';

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

describe('Indexing Lib', () => {
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;
    process.env.DOMAIN_URL = 'https://www.testdomain.com';
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
      // 2 sitemaps * 2 search engines = 4 pings
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
      expect(mockFetch).toHaveBeenCalledTimes(2);

      const calledUrls = mockFetch.mock.calls.map(call => call[0]);
      expect(calledUrls).toContain(
        `https://www.google.com/ping?sitemap=${encodeURIComponent('https://testdomain.com/sitemap.xml')}`
      );
      expect(calledUrls).toContain(
        `https://www.bing.com/ping?sitemap=${encodeURIComponent('https://testdomain.com/sitemap.xml')}`
      );
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
      
      // Still pings the main sitemap anyway
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
