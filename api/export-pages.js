import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { logError } from '../lib/logger.js';
import { query } from '../db/index.js';
import slugify from 'slugify';

function escapeCsvValue(val) {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default async function handler(req, res, currentKvClient) {
  const currentKv = currentKvClient || kv;
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.authToken;

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      await logError(error, 'JWT Verification Error in export-pages', 'export_pages_error.log');
      return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }

    const userId = decoded.userId;

    // Fetch user profile for custom domain mapping
    const userResult = await query('SELECT custom_domain FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User profile not found. Please log in again.' });
    }
    const user = userResult.rows[0];
    const customDomain = user.custom_domain;

    // Retrieve generated pages for the user from PostgreSQL
    const pagesResult = await query(
      `SELECT id, business_name, service, town, zip_code, created_at, telephone, price_range, opening_hours 
       FROM seo_pages WHERE user_id = $1`,
      [userId]
    );
    const pages = pagesResult.rows;

    // Build CSV Content
    const csvHeaders = [
      'Business Name',
      'Service',
      'Town',
      'Zip Code',
      'Telephone',
      'Price Range',
      'Opening Hours',
      'Views',
      'Unique Visitors',
      'Relative Path',
      'Full Link',
      'Date Created'
    ];
    const csvRows = [csvHeaders.join(',')];

    for (const page of pages) {
      const pageId = page.id;
      const views = await currentKv.get(`page:${pageId}:views`) || 0;
      const uniqueVisitors = await currentKv.scard(`page:${pageId}:unique_visitors`) || 0;
      
      const serviceSlug = slugify(page.service || '', { lower: true, strict: true });
      const townSlug = slugify(page.town || '', { lower: true, strict: true });
      
      const relativePath = `/${userId}/${serviceSlug}-in-${townSlug}.html`;
      const fullLink = customDomain 
        ? `https://${customDomain}/${serviceSlug}-in-${townSlug}.html`
        : `https://localseogen.com${relativePath}`;

      const formattedDate = page.created_at ? new Date(page.created_at).toISOString() : '';

      const row = [
        escapeCsvValue(page.business_name),
        escapeCsvValue(page.service),
        escapeCsvValue(page.town),
        escapeCsvValue(page.zip_code),
        escapeCsvValue(page.telephone),
        escapeCsvValue(page.price_range),
        escapeCsvValue(page.opening_hours),
        escapeCsvValue(views),
        escapeCsvValue(uniqueVisitors),
        escapeCsvValue(relativePath),
        escapeCsvValue(fullLink),
        escapeCsvValue(formattedDate)
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=localleads-generated-pages.csv');
    return res.status(200).send(csvContent);

  } catch (error) {
    await logError(error, 'Page Export Handler Error', 'export_pages_error.log');
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
