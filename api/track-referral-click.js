import { query } from '../db/index.js';
import { logError, logInfo } from '../lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { ref } = req.body;

  if (!ref) {
    return res.status(400).json({ message: 'Referral code is required.' });
  }

  try {
    // Increment the referral_clicks count for the user with this referral_code
    const result = await query(
      'UPDATE users SET referral_clicks = referral_clicks + 1 WHERE referral_code = $1 RETURNING id, email',
      [ref]
    );

    if (result.rows.length === 0) {
      await logInfo(`Referral click tracking attempted with invalid code: ${ref}`, 'Referral Click Tracking');
      return res.status(404).json({ message: 'Referral code not found.' });
    }

    const referrer = result.rows[0];
    await logInfo(`Referral click registered for referrer: ${referrer.email} (ID: ${referrer.id})`, 'Referral Click Tracking');

    return res.status(200).json({ message: 'Referral click tracked successfully.' });

  } catch (error) {
    await logError(error, 'Track Referral Click Error', 'track_referral_click_error.log');
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
