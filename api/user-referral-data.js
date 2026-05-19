import { query } from '../db/index.js';
import { logError } from '../../lib/logger';
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

    // In a real application, you would fetch the user's referral data from the database.
    // For now, we'll return some mock data.

    const referralData = {
      referralCode: `REF-${userId}`,
      clicks: 123,
      signups: 45,
      totalEarned: 67.89,
      referredUsers: [
        { email: 'test1@example.com', date: '2026-05-10', status: 'Purchased', commission: 9.80 },
        { email: 'test2@example.com', date: '2026-05-11', status: 'Signed Up', commission: 0 },
      ]
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
