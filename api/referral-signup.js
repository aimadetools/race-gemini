import { query } from '../db/index.js';
import { logError } from '../../lib/logger';

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
    // In a real application, you would add the user to your database here.
    // For now, we'll just log the information.

    console.log(`New user signup: ${email}`);

    if (referralCode) {
      console.log(`User signed up with referral code: ${referralCode}`);
      // Here you would look up the referrer and credit them.
    }

    // You would typically return a JWT token here, similar to the login endpoint.
    return res.status(201).json({ message: 'User created successfully.' });

  } catch (error) {
    await logError(error, 'Referral Signup Error', 'referral_signup_error.log');
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
