import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { logError } from '../lib/logger.js';
import { query } from '../db/index.js';
import { syncGbpReviews } from '../lib/gbp-helper.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

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
      await logError(error, 'JWT Verification Error in sync-gbp-reviews', 'gbp_sync_error.log');
      return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }

    const userId = decoded.userId;

    // Verify if GBP Place ID, google_review_link, or Google OAuth is configured
    const userResult = await query(
      'SELECT google_review_link, gbp_place_id, gbp_oauth_refresh_token, gbp_oauth_access_token FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = userResult.rows[0];
    const hasOauth = !!(user.gbp_oauth_refresh_token && user.gbp_oauth_access_token);
    
    if (!user.google_review_link && !user.gbp_place_id && !hasOauth) {
      return res.status(400).json({ 
        message: 'Google Business Profile location is not configured. Please set a Google Review Link or Place ID/Location Search Term first.' 
      });
    }

    // Trigger reviews sync
    const syncResult = await syncGbpReviews(userId);

    return res.status(200).json({
      message: `Reviews synced successfully! Imported ${syncResult.syncedCount} new reviews.`,
      syncedCount: syncResult.syncedCount,
      testimonials: syncResult.testimonials
    });

  } catch (error) {
    await logError(error, 'GBP Reviews Sync Error', 'gbp_sync_error.log');
    return res.status(500).json({ message: 'Internal Server Error. Could not sync reviews.' });
  }
}
