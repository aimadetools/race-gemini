import bcrypt from 'bcryptjs';
import { query } from '../db/index.js'; // Import PostgreSQL query utility
import trackEventHandler from './track.js'; // Import the event tracking handler
import { logError } from '../lib/logger.js'; // Import centralized logger
import { nanoid } from 'nanoid'; // Import nanoid for generating referral codes

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

      // Generate a unique referral code for the new user
      const newReferralCode = nanoid(10);

      // Store user in PostgreSQL, including their own referral_code and referrer_id if provided
      const result = await query(
        'INSERT INTO users (email, password_hash, credits, referral_code, referrer_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [email, hashedPassword, 50, newReferralCode, referrerId || null] // Initial credits set to 50
      );
      const userId = result.rows[0].id;

      // If a referrerId was provided, track the referral in the 'referrals' table
      if (referrerId) {
        const referrerResult = await query('SELECT id FROM users WHERE referral_code = $1', [referrerId]);
        if (referrerResult.rows.length > 0) {
          const actualReferrerId = referrerResult.rows[0].id;
          await query('INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2)', [actualReferrerId, userId]);
          console.log(`Referral tracked: User ${userId} referred by user ${actualReferrerId}.`);
        } else {
          console.log(`Referrer with code ${referrerId} not found. Referral not tracked.`);
        }
      }

      // Track the signup event
      await trackEventHandler({
        method: 'POST',
        body: {
          eventName: 'user_signup',
          userId: userId,
          eventData: { email: email, referrerId: referrerId } // Include referrerId in tracking
        }
      }, {
        status: () => ({ json: () => {} }) // Mock response for tracking
      });

      return res.status(201).json({ message: 'User registered successfully!', userId });
    } catch (error) {
      console.error(error); // Log the full error for debugging
      await logError(error, 'Signup Processing Error', 'signup_error.log');
      if (error.code === '23505') { // Unique constraint violation (e.g., email already exists)
        return res.status(409).json({ message: 'User with this email already exists.' });
      }
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

