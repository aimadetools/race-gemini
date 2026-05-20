import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email, password, referralCode } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    console.log('Referral signup request body:', req.body);
    const salt = await bcrypt.genSalt(10);
    console.log('Password salt generated.');
    const passwordHash = await bcrypt.hash(password, salt);
    console.log('Password hashed.');
    const newReferralCode = nanoid(10);
    console.log('New referral code generated:', newReferralCode);

    const userResult = await query(
      'INSERT INTO users (email, password_hash, referral_code) VALUES ($1, $2, $3) RETURNING id',
      [email, passwordHash, newReferralCode]
    );
    const newUser = userResult.rows[0];
    console.log('New user created with ID:', newUser.id);

    if (referralCode) {
      console.log('Referral code provided:', referralCode);
      const referrerResult = await query('SELECT id FROM users WHERE referral_code = $1', [referralCode]);
      if (referrerResult.rows.length > 0) {
        const referrer = referrerResult.rows[0];
        console.log('Referrer found with ID:', referrer.id);
        await query('INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2)', [referrer.id, newUser.id]);
        console.log('Referral tracked in database.');
      } else {
        console.log('Referrer not found for code:', referralCode);
      }
    }

    return res.status(201).json({ message: 'User created successfully.' });

  } catch (error) {
    console.error(error);
    await logError(error, 'Referral Signup Error', 'referral_signup_error.log');
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ message: 'Email already exists.' });
    }
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
