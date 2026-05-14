import bcrypt from 'bcrypt';
import { kv } from '@vercel/kv'; // Import kv for referrer data management
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

      // If a referrerId is present, update the referrer's data in Vercel KV
      if (referrerId) {
        try {
          const referrerDataKey = `user:${referrerId}:referral_data`;
          let referrerData = await currentKv.get(referrerDataKey);

          if (!referrerData) {
            // Initialize referrer data if it doesn't exist
            referrerData = {
              referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/referral-signup?ref=${referrerId}`,
              totalReferrals: 0,
              convertedReferrals: 0,
              earnedRewards: 0.00,
              recentReferrals: [],
            };
          } else {
            // Parse existing JSON string if it exists
            referrerData = JSON.parse(referrerData);
          }

          // Update referrer's statistics
          referrerData.totalReferrals = (referrerData.totalReferrals || 0) + 1;
          
          // Add the newly signed-up user to recentReferrals
          const newReferralEntry = {
            id: userId, // ID of the newly signed-up user
            userEmail: email, // Email of the newly signed-up user
            status: 'Signed Up', // Initial status
            date: new Date().toISOString(),
            reward: 0.00, // No reward yet, will be updated on conversion
          };
          referrerData.recentReferrals.push(newReferralEntry);

          // Save updated referrer data back to Vercel KV
          await currentKv.set(referrerDataKey, JSON.stringify(referrerData));
          console.log(`Referrer ${referrerId} data updated in Vercel KV.`);
        } catch (kvError) {
          await logError(kvError, 'Vercel KV Update Error for Referrer', 'signup_kv_error.log');
          // Do not block user signup if KV update fails
        }
      }

      // Track the signup event
      // We need to mock res object for trackEventHandler as it expects a res object.
      // The actual response for signup is handled by the signup handler itself.
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
      await logError(error, 'Signup Processing Error', 'signup_error.log');
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

