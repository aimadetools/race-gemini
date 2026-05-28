import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Clear all potential auth cookies by setting their maxAge to 0 (expired)
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  };

  const serializedCookies = [
    serialize('authToken', '', cookieOptions),
    serialize('auth', '', cookieOptions),
    serialize('token', '', cookieOptions),
  ];

  res.setHeader('Set-Cookie', serializedCookies);

  return res.status(200).json({ message: 'Logged out successfully!' });
}
