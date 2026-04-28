import { kv } from '@vercel/kv';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

async function logError(error, context) {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFilePath = path.join(logDir, 'signup_error.log');
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] Context: ${context}\nError: ${error.message}\nStack: ${error.stack}\n\n`;
  fs.appendFileSync(logFilePath, errorMessage);
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email, password } = req.body;

    if (!email || !password) {
      await logError(new Error('Email and password are required.'), 'Validation Error');
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
      // Check if user already exists
      const existingUser = await kv.get(`user:${email}`);
      if (existingUser) {
        return res.status(409).json({ message: 'User with this email already exists.' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10

      // Generate a unique user ID (simple timestamp for now, can be improved)
      const userId = `user_${Date.now()}`;

      // Store user in KV
      await kv.set(`user:${email}`, JSON.stringify({
        id: userId,
        email,
        hashedPassword,
        createdAt: new Date().toISOString(),
        credits: 50 // Initial credits
      }));

      // Optionally, store a reverse lookup from userId to email if needed
      await kv.set(`userId:${userId}`, email);

      return res.status(201).json({ message: 'User registered successfully!', userId });
    } catch (error) {
      await logError(error, 'Signup Processing Error');
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

