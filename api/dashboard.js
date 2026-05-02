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
  const logFilePath = path.join(logDir, 'dashboard_error.log'); // Separate log file for dashboard errors
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
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
      } catch (error) {
        await logError(error, 'JWT Verification Error');
        return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
      }

      const userId = decoded.userId;

      // Retrieve user email from userId
      const userEmail = await currentKv.get(`userId:${userId}`);
      if (!userEmail) {
          return res.status(404).json({ message: 'User not found. Please log in again.' });
      }

      // Retrieve full user object
      const userString = await currentKv.get(`user:${userEmail}`);
      if (!userString) {
          return res.status(404).json({ message: 'User profile not found.' });
      }
      const user = JSON.parse(userString);

      // Retrieve generated pages for the user
      const pageIds = await currentKv.smembers(`user:${userId}:pages`);
      const generatedPages = [];

      for (const pageId of pageIds) {
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
        email: user.email,
        credits: user.credits,
        generatedPages: generatedPages,
      });

    } catch (error) {
      await logError(error, 'Dashboard Data Fetch Error');
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
