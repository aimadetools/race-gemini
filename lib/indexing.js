import { promises as fs } from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';
import slugify from 'slugify';
import { query } from '../db/index.js';
import { logError, logInfo } from './logger.js';

async function addIndexingNotification(userId, message, status) {
  if (!userId) return;
  const notification = {
    id: `notif:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    message,
    status // 'success' or 'error'
  };
  try {
    await kv.lpush(`user:${userId}:notifications`, JSON.stringify(notification));
    // Keep only the last 50 notifications
    await kv.ltrim(`user:${userId}:notifications`, 0, 49);
  } catch (error) {
    console.error('Failed to add indexing notification to KV:', error);
  }
}

export async function submitSitemapToSearchEngines(userId, req) {
  let baseUrl = process.env.DOMAIN_URL || 'https://www.localseogen.com';
  
  if (req && req.headers) {
    const host = req.headers.host || 'localseogen.com';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    baseUrl = `${protocol}://${host}`;
  }

  // Construct client sitemap URL
  // We can ping both the clean path and the api path since Vercel routes might map either
  const sitemapUrls = [
    `${baseUrl}/${userId}/sitemap.xml`,
    `${baseUrl}/api/${userId}/sitemap.xml`
  ];

  for (const sitemapUrl of sitemapUrls) {
    await pingSearchEngines(sitemapUrl, userId);
  }

  // Fetch individual page URLs to submit directly to IndexNow
  try {
    const result = await query('SELECT service, town FROM seo_pages WHERE user_id = $1', [userId]);
    const urlsToSubmit = [];
    for (const row of result.rows) {
      if (row.service && row.town) {
        const resolvedServiceSlug = slugify(row.service, { lower: true, strict: true });
        const resolvedTownSlug = slugify(row.town, { lower: true, strict: true });
        const pageUrl = `${baseUrl}/${userId}/${resolvedServiceSlug}-in-${resolvedTownSlug}.html`;
        urlsToSubmit.push(pageUrl);
      }
    }

    if (urlsToSubmit.length > 0) {
      await submitToIndexNow(userId, urlsToSubmit, baseUrl);
    }
  } catch (error) {
    await logError(error, 'IndexNow URL Retrieval Error');
  }
}

export async function updateStaticSitemapAndPing(urls, req, userId) {
  let baseUrl = process.env.DOMAIN_URL || 'https://www.localseogen.com';
  
  if (req && req.headers) {
    const host = req.headers.host || 'localseogen.com';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    baseUrl = `${protocol}://${host}`;
  }

  // 1. Update the static sitemap.xml file
  try {
    const sitemapPath = path.join(process.cwd(), 'sitemap.xml');
    let content = await fs.readFile(sitemapPath, 'utf8');
    
    // Filter out URLs that are already in the sitemap to prevent duplicates
    const newUrls = urls.filter(url => !content.includes(`<loc>${url}</loc>`));
    
    if (newUrls.length > 0) {
      let xmlAppend = '';
      const lastmod = new Date().toISOString().substring(0, 10);
      for (const url of newUrls) {
        xmlAppend += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }

      content = content.replace('</urlset>', `${xmlAppend}</urlset>`);
      await fs.writeFile(sitemapPath, content, 'utf8');
      await logInfo(`Added ${newUrls.length} new URLs to static sitemap.xml`, 'Sitemap Update');
      if (userId) {
        await addIndexingNotification(userId, `Added ${newUrls.length} new pages to static sitemap.xml`, 'success');
      }
    }
  } catch (error) {
    await logError(error, 'Static Sitemap Update Error');
    if (userId) {
      await addIndexingNotification(userId, `Failed to update static sitemap: ${error.message}`, 'error');
    }
  }

  // 2. Ping Google and Bing with the main sitemap URL
  const mainSitemapUrl = `${baseUrl}/sitemap.xml`;
  await pingSearchEngines(mainSitemapUrl, userId);

  // 3. Submit static URLs to IndexNow
  if (urls && urls.length > 0) {
    await submitToIndexNow(userId, urls, baseUrl);
  }
}

async function pingSearchEngines(sitemapUrl, userId) {
  // 1. Ping Google
  const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  try {
    const response = await fetch(googlePingUrl);
    if (response.ok) {
      await logInfo(`Successfully registered sitemap with Google: ${sitemapUrl}`, 'Google Sitemap Ping');
      if (userId) {
        await addIndexingNotification(userId, `Successfully registered sitemap with Google: ${sitemapUrl}`, 'success');
      }
    } else {
      await logError(new Error(`Failed to ping Google. Status: ${response.status} ${response.statusText}`), 'Google Sitemap Ping');
      if (userId) {
        await addIndexingNotification(userId, `Failed to register sitemap with Google (status: ${response.status})`, 'error');
      }
    }
  } catch (error) {
    await logError(error, 'Google Sitemap Ping Exception');
    if (userId) {
      await addIndexingNotification(userId, `Error registering sitemap with Google: ${error.message}`, 'error');
    }
  }

  // 2. Ping Bing
  const bingPingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  try {
    const response = await fetch(bingPingUrl);
    if (response.ok) {
      await logInfo(`Successfully registered sitemap with Bing: ${sitemapUrl}`, 'Bing Sitemap Ping');
      if (userId) {
        await addIndexingNotification(userId, `Successfully registered sitemap with Bing: ${sitemapUrl}`, 'success');
      }
    } else {
      await logError(new Error(`Failed to ping Bing. Status: ${response.status} ${response.statusText}`), 'Bing Sitemap Ping');
      if (userId) {
        await addIndexingNotification(userId, `Failed to register sitemap with Bing (status: ${response.status})`, 'error');
      }
    }
  } catch (error) {
    await logError(error, 'Bing Sitemap Ping Exception');
    if (userId) {
      await addIndexingNotification(userId, `Error registering sitemap with Bing: ${error.message}`, 'error');
    }
  }
}

export async function submitToIndexNow(userId, urls, baseUrl) {
  if (!urls || urls.length === 0) return;
  
  // Skip IndexNow in development/test/staging environments
  let host = 'localseogen.com';
  try {
    host = new URL(baseUrl).hostname;
  } catch (e) {
    host = baseUrl;
  }

  if (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('vercel.app')) {
    await logInfo('Skipping IndexNow submission in development/staging environment.', 'IndexNow');
    return;
  }

  const payload = {
    host: host,
    key: '7bf308b417de4c5bb2a4a3dfb1234567',
    keyLocation: `${baseUrl}/7bf308b417de4c5bb2a4a3dfb1234567.txt`,
    urlList: urls
  };

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      await logInfo(`Successfully submitted ${urls.length} URLs to IndexNow: ${urls.join(', ')}`, 'IndexNow');
      if (userId) {
        await addIndexingNotification(userId, `Successfully submitted ${urls.length} pages to search engines via IndexNow.`, 'success');
      }
    } else {
      const errorText = await response.text();
      await logError(new Error(`IndexNow failed. Status: ${response.status} ${response.statusText}. Response: ${errorText}`), 'IndexNow');
      if (userId) {
        await addIndexingNotification(userId, `Failed to submit pages via IndexNow (status: ${response.status})`, 'error');
      }
    }
  } catch (error) {
    await logError(error, 'IndexNow Exception');
    if (userId) {
      await addIndexingNotification(userId, `Error submitting pages via IndexNow: ${error.message}`, 'error');
    }
  }
}
