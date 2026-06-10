import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import fs from 'fs';
import path from 'path';
import { logError } from '../../lib/logger.js';
import { query } from '../../db/index.js';



export default async function handler(req, res, currentKvClient) {
  const currentKv = currentKvClient || kv;
  if (req.method === 'GET') {
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
        await logError(error, 'JWT Verification Error', 'dashboard_pages_error.log');
        return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
      }

      const userId = decoded.userId;

      const offset = parseInt(req.query.offset || '0', 10);
      const limit = parseInt(req.query.limit || '10', 10);

      // Count total pages from PostgreSQL
      const countResult = await query('SELECT COUNT(*) FROM seo_pages WHERE user_id = $1', [userId]);
      const total = parseInt(countResult.rows[0].count, 10);

      // Fetch paginated pages from PostgreSQL
      const pagesResult = await query(
        `SELECT id, file_name, slug, business_name, service, town, zip_code, created_at, updated_at, telephone, price_range, opening_hours, enable_ai_copy, ai_style, ai_keywords 
         FROM seo_pages WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const generatedPages = [];
      for (const row of pagesResult.rows) {
          const pageId = row.id;
          const views = await currentKv.get(`page:${pageId}:views`) || 0;
          const uniqueVisitors = await currentKv.scard(`page:${pageId}:unique_visitors`) || 0;
          generatedPages.push({
              pageId,
              businessName: row.business_name,
              service: row.service,
              town: row.town,
              zipCode: row.zip_code,
              createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
              updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
              telephone: row.telephone,
              priceRange: row.price_range,
              openingHours: row.opening_hours,
              enableAICopy: row.enable_ai_copy,
              aiStyle: row.ai_style,
              aiKeywords: row.ai_keywords,
              views,
              uniqueVisitors
          });
      }

      return res.status(200).json({
        pages: generatedPages,
        total: total,
        offset: offset,
        limit: limit
      });

    } catch (error) {
      await logError(error, 'Generated Pages Fetch Error', 'dashboard_pages_error.log');
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
