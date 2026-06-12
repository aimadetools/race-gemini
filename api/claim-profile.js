import { query } from '../db/index.js';
import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { nanoid } from 'nanoid';
import { logError } from '../lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { slug, email, password } = req.body;

  if (!slug || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields: slug, email, password' });
  }

  try {
    // 1. Fetch agency target
    const agencyResult = await query(
      'SELECT id, name, claimed_user_id FROM agency_directory WHERE slug = $1',
      [slug]
    );

    if (agencyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Agency listing not found.' });
    }

    const agency = agencyResult.rows[0];

    if (agency.claimed_user_id !== null) {
      return res.status(409).json({ message: 'This agency profile has already been claimed.' });
    }

    // 2. Check if a user with this email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'A user account with this email already exists. Please log in first.' });
    }

    // 3. Create password hash and insert user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newReferralCode = nanoid(10);

    // Insert user into PostgreSQL with is_agency = true and initial credits = 50 (to give them enough credits to test agency platform!)
    const userResult = await query(
      `INSERT INTO users (email, password_hash, credits, referral_code, is_agency, name) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [email, hashedPassword, 50, newReferralCode, true, agency.name]
    );
    const userId = userResult.rows[0].id;

    // 4. Update agency_directory mapping
    await query(
      'UPDATE agency_directory SET claimed_user_id = $1 WHERE id = $2',
      [userId, agency.id]
    );

    // 5. Generate JWT token
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 6. Create session in KV
    try {
      const sessionId = `sess_${Date.now()}_${userId}`;
      await kv.set(`session:${sessionId}`, JSON.stringify({ userId, expiresAt: Date.now() + 3600 * 1000 }));
    } catch (kvError) {
      console.warn('Failed to create session in KV (non-blocking):', kvError.message);
    }

    // 7. Set cookie
    res.setHeader('Set-Cookie', serialize('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'production' ? false : true,
      sameSite: 'strict',
      maxAge: 3600, // 1 hour
      path: '/'
    }));

    return res.status(201).json({ 
      message: 'Agency profile claimed successfully!', 
      userId,
      agencyName: agency.name
    });
  } catch (error) {
    await logError(error, `Claim Agency Profile Error for slug: ${slug}, email: ${email}`);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
