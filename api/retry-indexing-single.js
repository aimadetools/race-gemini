import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { logError } from '../lib/logger.js';
import { query } from '../db/index.js';
import { requestGoogleIndexing } from '../lib/gsc.js';
import { recordFailedIndexingRequest, removeSuccessfulIndexingRequest } from '../lib/indexing.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const cookies = parse(req.headers.cookie || '');
  const token = cookies.authToken;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated. Please log in.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    await logError(error, 'Retry Indexing Single - JWT Verification Error', 'retry_indexing_error.log');
    return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
  }

  const userId = decoded.userId;
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ message: 'Missing required field: url' });
  }

  try {
    // 1. Verify that this URL is in the user's retry queue, OR is one of their pages
    const checkResult = await query(
      'SELECT id FROM indexing_retry_queue WHERE user_id = $1 AND page_url = $2',
      [userId, url]
    );

    if (checkResult.rows.length === 0) {
      const userResult = await query('SELECT custom_domain FROM users WHERE id = $1', [userId]);
      const customDomain = userResult.rows[0]?.custom_domain;
      const isDefaultUrl = url.includes(`/${userId}/`);
      const isCustomUrl = customDomain && url.includes(customDomain);

      if (!isDefaultUrl && !isCustomUrl) {
        return res.status(403).json({ message: 'Unauthorized. You do not own this page URL.' });
      }
    }

    // 2. Submit to Google Indexing
    const indexingApiResult = await requestGoogleIndexing(url);

    if (indexingApiResult.success) {
      await removeSuccessfulIndexingRequest(userId, url);
      
      const fileName = url.split('/').pop() || '';
      const slug = fileName.replace('.html', '');
      await query(
        `UPDATE seo_pages 
         SET indexing_status = 'Indexing Requested', last_indexing_check = NOW(), updated_at = NOW() 
         WHERE user_id = $1 AND (slug = $2 OR file_name = $3)`,
        [userId, slug, fileName]
      );

      return res.status(200).json({
        success: true,
        message: 'Crawl request submitted successfully.',
        mocked: indexingApiResult.mocked
      });
    } else {
      await recordFailedIndexingRequest(userId, url, indexingApiResult.error);
      return res.status(500).json({
        success: false,
        message: 'Google Indexing API submission failed.',
        error: indexingApiResult.error
      });
    }
  } catch (error) {
    await logError(error, 'Retry Indexing Single - General Error', 'retry_indexing_error.log');
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
