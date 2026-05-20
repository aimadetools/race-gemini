import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';
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
    console.log('User referral data request cookies:', req.cookies);
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    const userId = decoded.userId;
    console.log('User ID from token:', userId);

    console.log('Fetching user referral code...');
    const userResult = await query('SELECT referral_code FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      console.log('User not found.');
      return res.status(404).json({ message: 'User not found.' });
    }
    const referralCode = userResult.rows[0].referral_code;
    console.log('User referral code:', referralCode);

    console.log('Fetching referral stats...');
    const statsResult = await query(
      `SELECT
        COUNT(*) AS signups,
        COALESCE(SUM(commission_earned), 0) AS totalEarned
      FROM referrals
      WHERE referrer_id = $1`,
      [userId]
    );
    const { signups, totalearned } = statsResult.rows[0];
    console.log('Referral stats:', { signups, totalearned });

    console.log('Fetching referred users...');
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
    console.log('Referred users:', referredUsers);

    const referralData = {
      referralCode,
      clicks: 0, // Clicks are not tracked yet
      signups: parseInt(signups, 10),
      totalEarned: parseFloat(totalearned),
      referredUsers,
    };
    console.log('Returning referral data:', referralData);

    return res.status(200).json(referralData);

  } catch (error) {
    console.error(error);
    await logError(error, 'User Referral Data Error', 'user_referral_data_error.log');
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
