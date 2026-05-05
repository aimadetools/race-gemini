// api/track.js
import { connectToDatabase } from '../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { eventName, userId, eventData } = req.body;

  if (!eventName) {
    return res.status(400).json({ message: 'eventName is required.' });
  }

  let client;
  try {
    const pool = await connectToDatabase();
    client = await pool.connect();
    
    const query = `
      INSERT INTO user_events(event_name, user_id, event_data)
      VALUES($1, $2, $3)
      RETURNING *;
    `;
    const values = [eventName, userId || null, eventData || null];
    
    await client.query(query, values);
    
    return res.status(200).json({ message: 'Event tracked successfully.' });

  } catch (error) {
    console.error('Error tracking event:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (client) {
      client.release();
    }
  }
}
