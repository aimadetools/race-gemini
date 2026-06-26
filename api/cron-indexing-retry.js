import { query } from '../db/index.js';
import { submitToGoogleIndexing } from '../lib/indexing.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { authorization } = req.headers;
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // 1. Fetch pending failed indexing requests that haven't exceeded 5 attempts
    const failedRequests = await query(
      `SELECT user_id, page_url FROM indexing_retry_queue WHERE attempts < 5`
    );

    if (failedRequests.rows.length === 0) {
      return res.status(200).json({
        message: 'No failed indexing requests in the retry queue.',
        retriedCount: 0
      });
    }

    // 2. Group by user_id
    const userGroups = {};
    for (const row of failedRequests.rows) {
      if (!userGroups[row.user_id]) {
        userGroups[row.user_id] = [];
      }
      userGroups[row.user_id].push(row.page_url);
    }

    // 3. Resubmit for each user
    let totalRetried = 0;
    for (const userId of Object.keys(userGroups)) {
      const urls = userGroups[userId];
      totalRetried += urls.length;
      console.log(`Retrying Google indexing for user ${userId} with ${urls.length} URLs...`);
      await submitToGoogleIndexing(userId, urls);
    }

    return res.status(200).json({
      message: `Successfully executed indexing retries.`,
      retriedCount: totalRetried,
      usersProcessed: Object.keys(userGroups).length
    });

  } catch (error) {
    console.error('Error in cron-indexing-retry endpoint:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
