import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

async function run() {
  console.log('=== SITEMAP XML AUDIT ===');
  let sitemapPath = path.join(process.cwd(), 'sitemap.xml');

  if (!fs.existsSync(sitemapPath)) {
    // Try script directory parent
    const scriptDir = path.dirname(new URL(import.meta.url).pathname);
    sitemapPath = path.join(scriptDir, '..', 'sitemap.xml');
  }

  if (!fs.existsSync(sitemapPath)) {
    console.error('sitemap.xml does not exist at ' + sitemapPath);
    process.exit(1);
  }

  const content = fs.readFileSync(sitemapPath, 'utf8');
  console.log(`sitemap.xml file size: ${(content.length / 1024).toFixed(2)} KB`);

  // 1. Verify basic XML structure
  if (!content.trim().startsWith('<?xml') && !content.trim().startsWith('<urlset')) {
    console.error('Invalid XML declaration/root element');
  }

  // 2. Parse sitemap and extract URLs
  const $ = cheerio.load(content, { xmlMode: true });
  const urls = [];
  $('url loc').each((i, el) => {
    urls.push($(el).text());
  });

  console.log(`Total URLs in sitemap: ${urls.length}`);

  // 3. Check for duplicates
  const uniqueUrls = new Set(urls);
  console.log(`Unique URLs in sitemap: ${uniqueUrls.size}`);
  if (urls.length !== uniqueUrls.size) {
    console.warn(`⚠️ WARNING: Found ${urls.length - uniqueUrls.size} duplicate URLs in sitemap.xml!`);
    
    // Find duplicate items
    const duplicates = [];
    const seen = new Set();
    for (const url of urls) {
      if (seen.has(url)) {
        duplicates.push(url);
      } else {
        seen.add(url);
      }
    }
    console.log('Duplicate examples (up to 10):', duplicates.slice(0, 10));
  } else {
    console.log('✅ No duplicate URLs found in sitemap.xml.');
  }

  // 4. Check for key static files
  const keyStaticUrls = [
    'https://www.localseogen.com/',
    'https://www.localseogen.com/index.html',
    'https://www.localseogen.com/about.html',
    'https://www.localseogen.com/pricing.html',
    'https://www.localseogen.com/faq.html',
    'https://www.localseogen.com/contact.html',
    'https://www.localseogen.com/audit.html',
    'https://www.localseogen.com/buy-credits.html',
    'https://www.localseogen.com/referral-program.html'
  ];

  console.log('\nChecking indexing presence of key static URLs:');
  for (const staticUrl of keyStaticUrls) {
    const present = uniqueUrls.has(staticUrl);
    console.log(`- ${staticUrl}: ${present ? '✅ Indexed' : '❌ NOT in sitemap'}`);
  }

  console.log('\nChecking HTTP status of key static URLs (Health Check):');
  for (const staticUrl of keyStaticUrls) {
    try {
      const response = await fetch(staticUrl, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (Sitemap Audit)' } });
      console.log(`- ${staticUrl}: ${response.status} ${response.statusText} (${response.ok ? '✅ OK' : '❌ FAILED'})`);
    } catch (error) {
      console.log(`- ${staticUrl}: ❌ FAILED to connect (${error.message})`);
    }
  }

  // 5. Sample check first 5 and last 5 URLs format
  console.log('\nURL sample check:');
  console.log('First 5:', urls.slice(0, 5));
  console.log('Last 5:', urls.slice(-5));

  process.exit(0);
}

run().catch(err => {
  console.error('Error running sitemap audit:', err);
  process.exit(1);
});
