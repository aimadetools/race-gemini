import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import fs from 'fs';
import path from 'path';
import { logError } from '../lib/logger.js';
import { query } from '../db/index.js';



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
        await logError(error, 'JWT Verification Error', 'dashboard_error.log');
        return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
      }

      const userId = decoded.userId;

      // Fetch user from PostgreSQL
      const userResult = await query('SELECT email, credits FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
          return res.status(404).json({ message: 'User profile not found. Please log in again.' });
      }
      const user = userResult.rows[0];

      // Retrieve generated pages for the user
      const pageIds = await currentKv.smembers(`user:${userId}:pages`);
      const generatedPages = [];

      for (const pageId of pageIds) {
        const pageDataString = await currentKv.get(pageId);
        if (pageDataString) {
          const pageData = JSON.parse(pageDataString);
          const views = await currentKv.get(`page:${pageId}:views`) || 0;
          const uniqueVisitors = await currentKv.scard(`page:${pageId}:unique_visitors`) || 0;
          generatedPages.push({
            pageId,
            ...pageData,
            views: parseInt(views),
            uniqueVisitors: parseInt(uniqueVisitors),
          });
        }
      }

      // Retrieve credit transaction history
      const transactionStrings = await currentKv.lrange(`user:${userId}:credittransactions`, 0, 100) || [];
      const creditTransactions = transactionStrings.map(t => JSON.parse(t));

      // Retrieve indexing notifications
      const notificationStrings = await currentKv.lrange(`user:${userId}:notifications`, 0, 49) || [];
      const indexingNotifications = notificationStrings.map(n => JSON.parse(n));

      return res.status(200).json({
        email: user.email,
        credits: user.credits,
        generatedPages,
        creditTransactions,
        indexingNotifications,
      });

    } catch (error) {
      await logError(error, 'Dashboard Data Fetch Error', 'dashboard_error.log');
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
