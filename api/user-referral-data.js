import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies.authToken || req.cookies?.authToken;

  if (!authToken) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  try {
    console.log('User referral data request cookies:', req.cookies);
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    const userId = decoded.userId;
    console.log('User ID from token:', userId);

    console.log('Fetching user referral code and clicks...');
    const userResult = await query('SELECT referral_code, referral_clicks FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      console.log('User not found.');
      return res.status(404).json({ message: 'User not found.' });
    }
    const { referral_code: referralCode, referral_clicks: clicks } = userResult.rows[0];
    console.log('User referral code:', referralCode, 'clicks:', clicks);

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

    const parsedClicks = clicks || 0;
    const parsedSignups = parseInt(signups, 10) || 0;
    const commissionRate = parseFloat(process.env.REFERRAL_COMMISSION_RATE) || 0.35;

    const paidConversions = referredUsers.filter(u => u.status === 'purchased' || parseFloat(u.commission || 0) > 0).length;
    const clickToSignupRate = parsedClicks > 0 ? (parsedSignups / parsedClicks) * 100 : 0;
    const signupToPaidRate = parsedSignups > 0 ? (paidConversions / parsedSignups) * 100 : 0;

    const referralData = {
      referralCode,
      clicks: parsedClicks,
      signups: parsedSignups,
      totalEarned: parseFloat(totalearned),
      referredUsers,
      commissionRate,
      clickToSignupRate: parseFloat(clickToSignupRate.toFixed(2)),
      signupToPaidRate: parseFloat(signupToPaidRate.toFixed(2))
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
