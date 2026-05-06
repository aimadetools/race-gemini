import { query } from '../db/index.js'; // Import PostgreSQL query utility
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // For simplicity, we're assuming internal/webhook use or a privileged call.
    // In a real application, this endpoint would need stronger authentication/authorization.

    // For now, let's verify using JWT token from cookie if available,
    // but the primary use case for this will be from webhooks or other internal services
    // where a direct userId might be passed.
    let userId;
    if (req.cookies.authToken) {
      try {
        const decoded = jwt.verify(req.cookies.authToken, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (error) {
        // If token is invalid or expired, we might still proceed if a direct userId is provided
        // but log the issue.
        console.warn('Authentication token invalid or expired in update-credits:', error);
      }
    }

    const { targetUserId, amount } = req.body;

    // Prioritize targetUserId from body for webhook/internal calls
    const finalUserId = targetUserId || userId;

    if (!finalUserId || typeof amount !== 'number') {
      return res.status(400).json({ message: 'User ID and a valid amount are required.' });
    }

    try {
      const result = await query(
        'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
        [amount, finalUserId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const newCredits = result.rows[0].credits;
      return res.status(200).json({ message: 'Credits updated successfully.', newCredits });

    } catch (error) {
      console.error('Error updating credits:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
