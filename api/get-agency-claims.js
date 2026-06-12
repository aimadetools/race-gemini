import { query } from '../db/index.js';

export default async function handler(req, res) {
  const secret = req.query.secret || req.headers['x-admin-secret'];
  if (!process.env.MIGRATION_SECRET) {
    return res.status(401).json({ message: 'Unauthorized: MIGRATION_SECRET not configured.' });
  }
  if (secret !== process.env.MIGRATION_SECRET) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  if (req.method === 'GET') {
    try {
      const result = await query(`
        SELECT 
          ad.id,
          ad.name AS agency_name,
          ad.website,
          ad.city,
          ad.slug,
          u.email AS claimed_email,
          u.credits AS user_credits,
          u.created_at AS claimed_at
        FROM agency_directory ad
        JOIN users u ON ad.claimed_user_id = u.id
        ORDER BY u.created_at DESC
      `);

      const claims = result.rows.map(row => ({
        id: row.id,
        agencyName: row.agency_name,
        website: row.website,
        city: row.city,
        slug: row.slug,
        claimedEmail: row.claimed_email,
        userCredits: row.user_credits,
        claimedAt: row.claimed_at
      }));

      return res.status(200).json(claims);
    } catch (error) {
      console.error('Error fetching agency claims:', error);
      return res.status(500).json({ message: 'Failed to fetch agency claims.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
