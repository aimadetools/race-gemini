import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { kv } from '@vercel/kv';
import { query } from '../db/index.js'; // Import PostgreSQL query utility
import trackEventHandler from './track.js'; // Import the event tracking handler
import { logError } from '../lib/logger.js'; // Import centralized logger
import { nanoid } from 'nanoid'; // Import nanoid for generating referral codes

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email, password, referrerId, utm_source, utm_medium, utm_campaign, utm_term, gclid } = req.body;

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

      // Resolve the actual referrer's integer ID if referrerId (referral code) was provided
      let actualReferrerId = null;
      if (referrerId) {
        const referrerResult = await query('SELECT id FROM users WHERE referral_code = $1', [referrerId]);
        if (referrerResult.rows.length > 0) {
          actualReferrerId = referrerResult.rows[0].id;
        } else {
          console.log(`Referrer with code ${referrerId} not found.`);
        }
      }

      // Store user in PostgreSQL, including their own referral_code and referrer_id if provided
      const result = await query(
        'INSERT INTO users (email, password_hash, credits, referral_code, referrer_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [email, hashedPassword, 5, newReferralCode, actualReferrerId] // Initial credits set to 5
      );
      const userId = result.rows[0].id;

      // If a referrer was found, track the referral in the 'referrals' table
      if (actualReferrerId) {
        await query('INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2)', [actualReferrerId, userId]);
        console.log(`Referral tracked: User ${userId} referred by user ${actualReferrerId}.`);
      }

      // Track the signup event
      await trackEventHandler({
        method: 'POST',
        body: {
          eventName: 'user_signup',
          userId: userId,
          eventData: { 
            email: email, 
            referrerId: referrerId,
            utm_source: utm_source || null,
            utm_medium: utm_medium || null,
            utm_campaign: utm_campaign || null,
            utm_term: utm_term || null,
            gclid: gclid || null
          } // Include referrerId and UTM campaign attribution details
        }
      }, {
        status: () => ({ json: () => {} }) // Mock response for tracking
      });

      // Generate JWT token
      const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'dummy_jwt_secret_fallback', { expiresIn: '1h' });

      // Create a session in KV
      try {
        const sessionId = `sess_${Date.now()}_${userId}`;
        await kv.set(`session:${sessionId}`, JSON.stringify({ userId, expiresAt: Date.now() + 3600 * 1000 }));
      } catch (kvError) {
        console.warn('Failed to create session in KV (non-blocking):', kvError.message);
      }

      // Set HttpOnly cookie
      if (typeof res.setHeader === 'function') {
        res.setHeader('Set-Cookie', serialize('authToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development', // Use secure in production
          sameSite: 'strict',
          maxAge: 3600, // 1 hour
          path: '/',
        }));
      }

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

