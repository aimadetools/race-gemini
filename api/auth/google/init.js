import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { logError } from '../../../lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.authToken;

    if (!token) {
      return res.status(401).send('Not authenticated. Please log in first.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret_key_for_testing');
    } catch (err) {
      return res.status(401).send('Invalid or expired login session. Please log in again.');
    }

    const userId = decoded.userId;

    // Generate secure state token containing userId, expires in 15 mins
    const state = jwt.sign({ userId }, process.env.JWT_SECRET || 'dev_jwt_secret_key_for_testing', { expiresIn: '15m' });

    const clientId = process.env.GOOGLE_CLIENT_ID || 'dummy-google-client-id';
    
    // Construct redirect URI
    const domain = process.env.DOMAIN_URL || (req.headers.host ? `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}` : 'https://www.localseogen.com');
    const redirectUri = `${domain}/api/auth/google/callback`;

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent('https://www.googleapis.com/auth/business.manage')}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(state)}`;

    res.writeHead(302, { Location: googleAuthUrl });
    res.end();
  } catch (error) {
    await logError(error, 'Google Auth Init Error', 'gbp_auth_error.log');
    return res.status(500).send('Internal Server Error. Could not initialize Google Auth.');
  }
}
