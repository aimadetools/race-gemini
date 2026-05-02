import { kv } from '@vercel/kv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import fs from 'fs';
import path from 'path';

async function logError(error, context) {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFilePath = path.join(logDir, 'login_error.log'); // Separate log file for login errors
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] Context: ${context}
Error: ${error.message}
Stack: ${error.stack}

`;
  fs.appendFileSync(logFilePath, errorMessage);
}

export default async function handler(req, res, currentKvClient) {
  const currentKv = currentKvClient || kv;
  if (req.method === 'POST') {
    const { email, password } = req.body;

    if (!email || !password) {
      await logError(new Error('Email and password are required.'), 'Validation Error');
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
      const userString = await currentKv.get(`user:${email}`);
      if (!userString) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const user = JSON.parse(userString);

      const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '1h' });

      // Create a session in KV
      const sessionId = `sess_${Date.now()}_${user.id}`;
      await currentKv.set(`session:${sessionId}`, JSON.stringify({ userId: user.id, expiresAt: Date.now() + 3600 * 1000 }));
      // Set session to expire in KV after 1 hour, matching JWT expiration

      // Set HttpOnly cookie
      res.setHeader('Set-Cookie', serialize('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development', // Use secure in production
        sameSite: 'strict',
        maxAge: 3600, // 1 hour
        path: '/',
      }));

      return res.status(200).json({ message: 'Logged in successfully!', userId: user.id });
    } catch (error) {
      await logError(error, 'Login Processing Error');
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
