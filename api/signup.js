import bcrypt from 'bcrypt';
import { query } from '../db/index.js'; // Import PostgreSQL query utility
import trackEventHandler from './track.js'; // Import the event tracking handler
import { logError } from '../../lib/logger'; // Import centralized logger



export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email, password, referrerId } = req.body;

    if (!email || !password) {
      await logError(new Error('Email and password are required.'), 'Validation Error', 'signup_error.log');
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
      // Check if user already exists in PostgreSQL
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ message: 'User with this email already exists.' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10

      // Store user in PostgreSQL
      const result = await query(
        'INSERT INTO users (email, hashed_password, credits, referrer_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [email, hashedPassword, 50, referrerId] // Initial credits set to 50
      );
      const userId = result.rows[0].id;

      // Track the signup event
      // We need to mock res object for trackEventHandler as it expects a res object.
      // The actual response for signup is handled by the signup handler itself.
      await trackEventHandler({
        method: 'POST',
        body: {
          eventName: 'user_signup',
          userId: userId,
          eventData: { email: email }
        }
      }, {
        status: () => ({ json: () => {} }) // Mock response for tracking
      });

      return res.status(201).json({ message: 'User registered successfully!', userId });
    } catch (error) {
      await logError(error, 'Signup Processing Error', 'signup_error.log');
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

