import { connectToDatabase } from '../lib/db.js'; // Assuming this is the correct path for db connection


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // NOTE: The 'user_events' table must be created in the database for tracking to work.
  // This can be done by triggering the /api/migrate endpoint (requires MIGRATION_SECRET).

  const { eventName, userId, eventData } = req.body;

  if (!eventName) {
    return res.status(400).json({ message: 'eventName is required.' });
  }

  let client;
  try {
    const pool = await connectToDatabase();
    client = await pool.connect();

    // Temporarily commenting out database insertion until 'user_events' table can be created via migration.
    // const query = `
    //   INSERT INTO user_events(event_name, user_id, event_data)
    //   VALUES($1, $2, $3)
    //   RETURNING *;
    // `;
    // const values = [eventName, userId || null, eventData || null];

    // await client.query(query, values);

    // return res.status(200).json({ message: 'Event tracked successfully (database insertion temporarily disabled).' });

  } catch (error) {
    console.error('Error tracking event:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      client.release();
    }
  }
}

