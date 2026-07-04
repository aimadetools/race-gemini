import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'Share token is required' });
  }

  try {
    const result = await query(
      `SELECT id, name, logo_url, primary_color, google_review_link, facebook_review_link, yelp_review_link, email, phone 
       FROM users WHERE share_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Business portal not found or invalid link.' });
    }

    const business = result.rows[0];

    // Return only necessary public details to protect user privacy
    return res.status(200).json({
      userId: business.id,
      name: business.name || 'Local Services',
      logoUrl: business.logo_url || '/images/logo.svg',
      primaryColor: business.primary_color || '#3b82f6',
      googleReviewLink: business.google_review_link || null,
      facebookReviewLink: business.facebook_review_link || null,
      yelpReviewLink: business.yelp_review_link || null
    });
  } catch (error) {
    await logError(error, 'Get Feedback Details Error');
    return res.status(500).json({ message: 'Internal server error' });
  }
}
