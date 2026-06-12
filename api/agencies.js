import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { city, search, limit = 20, offset = 0 } = req.query;

  const parsedLimit = parseInt(limit, 10);
  const parsedOffset = parseInt(offset, 10);

  if (isNaN(parsedLimit) || parsedLimit <= 0 || isNaN(parsedOffset) || parsedOffset < 0) {
    return res.status(400).json({ message: 'Invalid limit or offset parameters' });
  }

  try {
    let baseQuery = `
      SELECT id, name, website, contact_name, city, slug, claimed_user_id, created_at 
      FROM agency_directory
    `;
    let countQuery = `
      SELECT COUNT(*) FROM agency_directory
    `;

    const whereClauses = [];
    const params = [];
    let paramIndex = 1;

    if (city) {
      whereClauses.push(`LOWER(city) = LOWER($${paramIndex})`);
      params.push(city);
      paramIndex++;
    }

    if (search) {
      whereClauses.push(`(LOWER(name) LIKE LOWER($${paramIndex}) OR LOWER(personalization) LIKE LOWER($${paramIndex}))`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (whereClauses.length > 0) {
      const whereString = ' WHERE ' + whereClauses.join(' AND ');
      baseQuery += whereString;
      countQuery += whereString;
    }

    // Add order by, limit, and offset
    baseQuery += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const selectParams = [...params, parsedLimit, parsedOffset];
    const agencyResult = await query(baseQuery, selectParams);

    // Get list of all unique cities for filtering dropdown
    const citiesResult = await query(
      'SELECT DISTINCT city FROM agency_directory WHERE city IS NOT NULL ORDER BY city ASC'
    );
    const cities = citiesResult.rows.map(row => row.city);

    return res.status(200).json({
      agencies: agencyResult.rows,
      totalCount,
      cities,
      limit: parsedLimit,
      offset: parsedOffset
    });
  } catch (error) {
    await logError(error, 'Get Agencies Directory Error');
    return res.status(500).json({ message: 'Internal server error' });
  }
}
