import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { query } from '../db/index.js'; // Import PostgreSQL query utility

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { authToken } = req.cookies;

    if (!authToken) {
      return res.status(401).json({ message: 'Authentication token missing.' });
    }

    try {
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
      const userId = decoded.userId;

      const result = await query('SELECT credits FROM users WHERE id = $1', [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const credits = result.rows[0].credits;
      return res.status(200).json({ credits });

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Authentication token expired.' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid authentication token.' });
      }
      console.error('Error fetching credits:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
