import { promises as fs } from 'fs';
import path from 'path';
import { logError, logInfo } from './logger.js';

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
    await pingSearchEngines(sitemapUrl);
  }
}

export async function updateStaticSitemapAndPing(urls, req) {
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
    }
  } catch (error) {
    await logError(error, 'Static Sitemap Update Error');
  }

  // 2. Ping Google and Bing with the main sitemap URL
  const mainSitemapUrl = `${baseUrl}/sitemap.xml`;
  await pingSearchEngines(mainSitemapUrl);
}

async function pingSearchEngines(sitemapUrl) {
  // 1. Ping Google
  const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  try {
    const response = await fetch(googlePingUrl);
    if (response.ok) {
      await logInfo(`Successfully registered sitemap with Google: ${sitemapUrl}`, 'Google Sitemap Ping');
    } else {
      await logError(new Error(`Failed to ping Google. Status: ${response.status} ${response.statusText}`), 'Google Sitemap Ping');
    }
  } catch (error) {
    await logError(error, 'Google Sitemap Ping Exception');
  }

  // 2. Ping Bing
  const bingPingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  try {
    const response = await fetch(bingPingUrl);
    if (response.ok) {
      await logInfo(`Successfully registered sitemap with Bing: ${sitemapUrl}`, 'Bing Sitemap Ping');
    } else {
      await logError(new Error(`Failed to ping Bing. Status: ${response.status} ${response.statusText}`), 'Bing Sitemap Ping');
    }
  } catch (error) {
    await logError(error, 'Bing Sitemap Ping Exception');
  }
}
