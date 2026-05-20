import { kv } from '@vercel/kv'; // Keep for session management
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { query } from '../db/index.js'; // Import PostgreSQL query utility
import { logError } from '../lib/logger.js'; // Import centralized logger



export default async function handler(req, res) { // Removed currentKvClient parameter
  const currentKv = kv; // Use kv directly for session management
  if (req.method === 'POST') {
    const { email, password } = req.body;

    if (!email || !password) {
      await logError(new Error('Email and password are required.'), 'Validation Error', 'login_error.log');
      return res.status(400).json({ message: 'Email and password are required.' });
    }
console.log('Login request body:', req.body);
try {
  // Fetch user from PostgreSQL
  console.log('Fetching user from database...');
  const result = await query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) {
    console.log('User not found.');
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const user = result.rows[0];
  console.log('User found:', user);

  const isValidPassword = await bcrypt.compare(password, user.password_hash); // Compare with password_hash from DB
  if (!isValidPassword) {
    console.log('Invalid password.');
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
  console.log('Password is valid.');

  // Generate JWT token
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log('JWT token generated.');

  // Create a session in KV (unchanged)
  try {
    const sessionId = `sess_${Date.now()}_${user.id}`;
    await currentKv.set(`session:${sessionId}`, JSON.stringify({ userId: user.id, expiresAt: Date.now() + 3600 * 1000 }));
    // Set session to expire in KV after 1 hour, matching JWT expiration
    console.log('Session created in KV.');
  } catch (kvError) {
    console.warn('Failed to create session in KV (non-blocking):', kvError.message);
  }

  // Set HttpOnly cookie (unchanged)
  res.setHeader('Set-Cookie', serialize('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development', // Use secure in production
    sameSite: 'strict',
    maxAge: 3600, // 1 hour
    path: '/',
  }));
  console.log('Cookie set.');

  return res.status(200).json({ message: 'Logged in successfully!', userId: user.id });
    } catch (error) {
      console.error(error);
      await logError(error, 'Login Processing Error', 'login_error.log');
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
