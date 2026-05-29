import { query } from '../db/index.js';
import { kv } from '@vercel/kv';

export default async function handler(req, res, currentKvClient) {
  const secret = req.query.secret || req.headers['x-admin-secret'];
  if (!process.env.MIGRATION_SECRET) {
    return res.status(401).json({ message: 'Unauthorized: MIGRATION_SECRET not configured.' });
  }
  if (secret !== process.env.MIGRATION_SECRET) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  const currentKv = currentKvClient || kv;
  if (req.method === 'GET') {
    try {
      // Fetch from PostgreSQL database first
      const dbResult = await query('SELECT * FROM agency_inquiries ORDER BY timestamp DESC');
      const dbInquiries = dbResult.rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        agencyName: row.agency_name,
        website: row.website,
        contactPerson: row.contact_person,
        contactEmail: row.contact_email,
        phoneNumber: row.phone_number,
        clientVolume: row.client_volume,
        message: row.message
      }));

      // Fallback/merge with KV inquiries for backwards compatibility (ignore error if KV fails)
      let kvInquiries = [];
      try {
        const inquiryKeys = [];
        for await (const key of currentKv.scanIterator({ match: 'agency-inquiry:*' })) {
          inquiryKeys.push(key);
        }
        if (inquiryKeys.length > 0) {
          const inquiries = await currentKv.mget(...inquiryKeys);
          kvInquiries = inquiries.map(inquiry => JSON.parse(inquiry));
        }
      } catch (kvError) {
        console.error('Non-blocking error fetching agency inquiries from Vercel KV:', kvError);
      }

      // Combine both lists (avoid duplicates based on ID)
      const combinedInquiries = [...dbInquiries];
      for (const kvInq of kvInquiries) {
        if (!combinedInquiries.some(dbInq => dbInq.id === kvInq.id)) {
          combinedInquiries.push(kvInq);
        }
      }

      // Sort by timestamp descending
      combinedInquiries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.status(200).json(combinedInquiries);
    } catch (error) {
      console.error('Error fetching agency inquiries:', error);
      res.status(500).json({ message: 'Failed to fetch agency inquiries.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
