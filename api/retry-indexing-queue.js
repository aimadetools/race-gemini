import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { logError } from '../lib/logger.js';
import { query } from '../db/index.js';
import { submitToGoogleIndexing } from '../lib/indexing.js';

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
    await logError(error, 'Retry Indexing Queue - JWT Verification Error', 'retry_indexing_queue_error.log');
    return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
  }

  const userId = decoded.userId;

  try {
    // 1. Fetch pending failed indexing requests that haven't exceeded 5 attempts
    const failedRequests = await query(
      `SELECT page_url FROM indexing_retry_queue WHERE user_id = $1 AND attempts < 5`,
      [userId]
    );

    if (failedRequests.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No failed indexing requests in the retry queue.',
        retriedCount: 0
      });
    }

    const urls = failedRequests.rows.map(row => row.page_url);

    // 2. Submit to Google Indexing
    await submitToGoogleIndexing(userId, urls);

    // 3. Find out which ones succeeded (no longer in queue) and update seo_pages status
    const afterFailedRequests = await query(
      `SELECT page_url FROM indexing_retry_queue WHERE user_id = $1`,
      [userId]
    );
    const afterUrls = new Set(afterFailedRequests.rows.map(row => row.page_url));
    const successfulUrls = urls.filter(u => !afterUrls.has(u));

    for (const url of successfulUrls) {
      const fileName = url.split('/').pop() || '';
      const slug = fileName.replace('.html', '');
      await query(
        `UPDATE seo_pages 
         SET indexing_status = 'Indexing Requested', last_indexing_check = NOW(), updated_at = NOW() 
         WHERE user_id = $1 AND (slug = $2 OR file_name = $3)`,
        [userId, slug, fileName]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully processed retry queue.',
      retriedCount: urls.length,
      succeededCount: successfulUrls.length,
      failedCount: urls.length - successfulUrls.length
    });

  } catch (error) {
    await logError(error, 'Retry Indexing Queue - General Error', 'retry_indexing_queue_error.log');
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
