import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';
import slugify from 'slugify';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { town, service, search, limit = 12, offset = 0 } = req.query;

  const parsedLimit = parseInt(limit, 10);
  const parsedOffset = parseInt(offset, 10);

  if (isNaN(parsedLimit) || parsedLimit <= 0 || isNaN(parsedOffset) || parsedOffset < 0) {
    return res.status(400).json({ message: 'Invalid limit or offset parameters' });
  }

  try {
    let baseQuery = `
      SELECT sp.id, sp.business_name, sp.service, sp.town, sp.created_at, sp.primary_color, sp.user_id, u.custom_domain
      FROM seo_pages sp
      JOIN users u ON sp.user_id = u.id
    `;
    let countQuery = `
      SELECT COUNT(*) 
      FROM seo_pages sp
      JOIN users u ON sp.user_id = u.id
    `;

    const whereClauses = [];
    const params = [];
    let paramIndex = 1;

    if (town) {
      whereClauses.push(`LOWER(sp.town) = LOWER($${paramIndex})`);
      params.push(town);
      paramIndex++;
    }

    if (service) {
      whereClauses.push(`LOWER(sp.service) = LOWER($${paramIndex})`);
      params.push(service);
      paramIndex++;
    }

    if (search) {
      whereClauses.push(`(LOWER(sp.business_name) LIKE LOWER($${paramIndex}) OR LOWER(sp.service) LIKE LOWER($${paramIndex}) OR LOWER(sp.town) LIKE LOWER($${paramIndex}))`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (whereClauses.length > 0) {
      const whereString = ' WHERE ' + whereClauses.join(' AND ');
      baseQuery += whereString;
      countQuery += whereString;
    }

    // Add order by, limit, and offset
    baseQuery += ` ORDER BY sp.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const selectParams = [...params, parsedLimit, parsedOffset];
    const pagesResult = await query(baseQuery, selectParams);

    // Map rows to include constructed URL
    const pages = pagesResult.rows.map(row => {
      const serviceSlug = slugify(row.service || '', { lower: true, strict: true });
      const townSlug = slugify(row.town || '', { lower: true, strict: true });
      
      let url = `/${row.user_id}/${serviceSlug}-in-${townSlug}.html`;
      if (row.custom_domain) {
        url = `https://${row.custom_domain}/${serviceSlug}-in-${townSlug}.html`;
      }
      
      return {
        id: row.id,
        businessName: row.business_name,
        service: row.service,
        town: row.town,
        createdAt: row.created_at,
        primaryColor: row.primary_color,
        url: url
      };
    });

    // Get list of unique cities/towns and services for filtering dropdowns
    const citiesResult = await query(
      'SELECT DISTINCT town FROM seo_pages WHERE town IS NOT NULL AND town != \'\' ORDER BY town ASC'
    );
    const towns = citiesResult.rows.map(row => row.town);

    const servicesResult = await query(
      'SELECT DISTINCT service FROM seo_pages WHERE service IS NOT NULL AND service != \'\' ORDER BY service ASC'
    );
    const services = servicesResult.rows.map(row => row.service);

    return res.status(200).json({
      pages,
      totalCount,
      towns,
      services,
      limit: parsedLimit,
      offset: parsedOffset
    });
  } catch (error) {
    console.error('SHOWCASE API ERROR:', error);
    await logError(error, 'Get Showcase Directory Error');
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
