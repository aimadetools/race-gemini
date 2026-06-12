import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { logError } from '../../../lib/logger.js';
import { query } from '../../../db/index.js';

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
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret_key_for_testing');
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
    }

    const userId = decoded.userId;

    const result = await query(
      `UPDATE users SET 
        gbp_oauth_refresh_token = NULL, 
        gbp_oauth_access_token = NULL, 
        gbp_oauth_token_expires_at = NULL,
        gbp_account_id = NULL,
        gbp_location_id = NULL,
        gbp_sync_enabled = FALSE
       WHERE id = $1
       RETURNING id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ message: 'Disconnected Google Business Profile successfully.' });
  } catch (error) {
    await logError(error, 'Google Auth Disconnect Error', 'gbp_auth_error.log');
    return res.status(500).json({ message: 'Internal Server Error. Could not disconnect.' });
  }
}
