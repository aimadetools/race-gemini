import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import fs from 'fs';
import path from 'path';

async function logError(error, context) {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFilePath = path.join(logDir, 'dashboard_pages_error.log'); // Separate log file for this endpoint
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] Context: ${context}
Error: ${error.message}
Stack: ${error.stack}

`;
  fs.appendFileSync(logFilePath, errorMessage);
}

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
        await logError(error, 'JWT Verification Error');
        return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
      }

      const userId = decoded.userId;

      const offset = parseInt(req.query.offset || '0', 10);
      const limit = parseInt(req.query.limit || '10', 10);

      // Retrieve generated page IDs for the user
      const allPageIds = await currentKv.smembers(`user:${userId}:pages`);
      
      // Sort pageIds for consistent pagination (e.g., by creation timestamp if available in id, or alphabetically)
      // For now, assuming smembers order is consistent enough or we can sort by pageId string
      allPageIds.sort(); // Simple alphabetical sort

      const paginatedPageIds = allPageIds.slice(offset, offset + limit);
      const generatedPages = [];

      for (const pageId of paginatedPageIds) {
          const pageDataString = await currentKv.get(pageId);
          if (pageDataString) {
              const pageData = JSON.parse(pageDataString);
              // Fetch page views and unique visitors
              const views = await currentKv.get(`page:${pageId}:views`) || 0;
              const uniqueVisitors = await currentKv.scard(`page:${pageId}:unique_visitors`) || 0;
              generatedPages.push({ ...pageData, pageId, views, uniqueVisitors });
          }
      }

      return res.status(200).json({
        pages: generatedPages,
        total: allPageIds.length,
        offset: offset,
        limit: limit
      });

    } catch (error) {
      await logError(error, 'Generated Pages Fetch Error');
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
