import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
      const agencyId = await kv.get(`agency:${email}`);
      if (!agencyId) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const agency = await kv.get(`agency:${agencyId}`);
      if (!agency) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const isValidPassword = await bcrypt.compare(password, agency.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const token = jwt.sign({ agencyId: agency.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.setHeader('Set-Cookie', serialize('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 3600,
        path: '/',
      }));

      return res.status(200).json({ message: 'Agency logged in successfully!', agencyId: agency.id });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
