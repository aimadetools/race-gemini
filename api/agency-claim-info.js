import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ message: 'Missing slug parameter' });
  }

  try {
    const result = await query(
      'SELECT name, email, city, website, claimed_user_id FROM agency_directory WHERE slug = $1',
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Agency not found' });
    }

    const agency = result.rows[0];

    return res.status(200).json({
      name: agency.name,
      email: agency.email,
      city: agency.city,
      website: agency.website,
      isClaimed: agency.claimed_user_id !== null
    });
  } catch (error) {
    await logError(error, `Get Agency Claim Info Error for slug: ${slug}`);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
