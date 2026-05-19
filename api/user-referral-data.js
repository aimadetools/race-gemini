import { query } from '../db/index.js';
import { logError } from '../../lib/logger.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { authToken } = req.cookies;

  if (!authToken) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  try {
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const userResult = await query('SELECT referral_code FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const referralCode = userResult.rows[0].referral_code;

    const statsResult = await query(
      `SELECT
        COUNT(*) AS signups,
        COALESCE(SUM(commission_earned), 0) AS totalEarned
      FROM referrals
      WHERE referrer_id = $1`,
      [userId]
    );
    const { signups, totalearned } = statsResult.rows[0];

    const referredUsersResult = await query(
      `SELECT
        u.email,
        r.created_at AS date,
        r.status,
        r.commission_earned AS commission
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at DESC`,
      [userId]
    );
    const referredUsers = referredUsersResult.rows;

    const referralData = {
      referralCode,
      clicks: 0, // Clicks are not tracked yet
      signups: parseInt(signups, 10),
      totalEarned: parseFloat(totalearned),
      referredUsers,
    };

    return res.status(200).json(referralData);

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    await logError(error, 'User Referral Data Error', 'user_referral_data_error.log');
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
