import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { logError } from '../lib/logger.js';
import { query } from '../db/index.js';

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
      await logError(error, 'JWT Verification Error in update-gbp-settings', 'gbp_sync_error.log');
      return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }

    const userId = decoded.userId;

    const { gbpSyncEnabled, gbpPlaceId } = req.body;

    const syncEnabled = !!gbpSyncEnabled;
    const placeId = gbpPlaceId ? gbpPlaceId.trim().substring(0, 255) : null;

    // Update in PostgreSQL
    const result = await query(
      `UPDATE users 
       SET gbp_sync_enabled = $1, 
           gbp_place_id = $2, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING gbp_sync_enabled, gbp_place_id`,
      [syncEnabled, placeId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ 
      message: 'Google Business Profile sync settings updated successfully.',
      settings: {
        gbpSyncEnabled: result.rows[0].gbp_sync_enabled,
        gbpPlaceId: result.rows[0].gbp_place_id
      }
    });

  } catch (error) {
    await logError(error, 'Update GBP Settings Error', 'gbp_sync_error.log');
    return res.status(500).json({ message: 'Internal Server Error. Could not update settings.' });
  }
}
