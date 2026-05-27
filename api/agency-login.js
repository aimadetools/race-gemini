import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async function handler(req, res, currentKvClient) {
  const currentKv = currentKvClient || kv;
  if (req.method === 'POST') {
    const { email, password } = req.body;

    if (!email || !password) {
      await logError(new Error('Email and password are required.'), 'Agency Login - Validation Error', 'agency_login_error.log');
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
      let user = null;
      let isLegacyKvUser = false;
      
      const pgResult = await query('SELECT id, password_hash, is_agency FROM users WHERE email = $1', [email]);
      if (pgResult.rows.length > 0) {
        user = pgResult.rows[0];
        if (!user.is_agency) {
          return res.status(401).json({ message: 'Invalid credentials.' });
        }
      } else {
        // Fallback to legacy KV user check
        const agencyId = await currentKv.get(`agency:${email}`);
        if (agencyId) {
          const legacyAgency = await currentKv.get(`agency:${agencyId}`);
          if (legacyAgency) {
            user = {
              id: agencyId,
              password_hash: legacyAgency.passwordHash,
              email: legacyAgency.email,
              name: legacyAgency.agencyName,
              is_agency: true
            };
            isLegacyKvUser = true;
          }
        }
      }

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      // On-the-fly migration of legacy KV agency to PostgreSQL
      if (isLegacyKvUser) {
        try {
          const insertResult = await query(
            'INSERT INTO users (email, password_hash, credits, is_agency, name) VALUES ($1, $2, 0, true, $3) RETURNING id',
            [user.email, user.password_hash, user.name]
          );
          user.id = insertResult.rows[0].id;
          await currentKv.set(`agency:${user.email}`, user.id);
        } catch (migrateError) {
          console.error('Failed to migrate KV agency to PostgreSQL on login:', migrateError);
        }
      }

      // Generate unified token with userId matching standard auth
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      // Unified cookie name: authToken
      res.setHeader('Set-Cookie', serialize('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 3600,
        path: '/',
      }));

      return res.status(200).json({ message: 'Agency logged in successfully!', agencyId: user.id });
    } catch (error) {
      await logError(error, 'Agency Login - General Error', 'agency_login_error.log');
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
