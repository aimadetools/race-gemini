import { query } from '../db/index.js';
import { syncGbpReviews } from '../lib/gbp-helper.js';
import { logError } from '../lib/logger.js';

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

    // 1. Fetch all users who have enabled Google Business Profile sync
    const usersResult = await query(
      `SELECT id, email, google_review_link, gbp_place_id 
       FROM users 
       WHERE gbp_sync_enabled = true`
    );

    let totalChecked = 0;
    let totalSyncedReviews = 0;
    let totalFailed = 0;

    for (const user of usersResult.rows) {
      totalChecked++;

      // User must have either a review link or place ID configured
      if (!user.google_review_link && !user.gbp_place_id) {
        totalFailed++;
        continue;
      }

      try {
        const syncResult = await syncGbpReviews(user.id);
        totalSyncedReviews += syncResult.syncedCount;
      } catch (err) {
        totalFailed++;
        await logError(err, `Cron GBP Sync failed for user ID ${user.id}`, 'gbp_cron_error.log');
      }
    }

    return res.status(200).json({
      message: 'Automated Google Business Profile reviews sync completed.',
      usersChecked: totalChecked,
      reviewsSynced: totalSyncedReviews,
      failedUsers: totalFailed
    });

  } catch (error) {
    console.error('Error in cron-gbp-sync endpoint:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
