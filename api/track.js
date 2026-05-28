import { connectToDatabase } from '../lib/db.js';
import { kv } from '@vercel/kv';

export default async function handler(req, res, currentKvClient) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const currentKv = currentKvClient || kv;
  const { eventName, userId, eventData, pageId } = req.body;

  const resolvedEventName = eventName || (pageId ? 'page_view' : null);

  if (!resolvedEventName) {
    return res.status(400).json({ message: 'eventName is required.' });
  }

  const rawIp = (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
  const ip = rawIp.split(',')[0].trim();

  let resolvedEventData = eventData || null;

  if (pageId) {
    try {
      await currentKv.incr(`page:${pageId}:views`);
      await currentKv.sadd(`page:${pageId}:unique_visitors`, ip);
      resolvedEventData = { ...(eventData || {}), pageId, ip };
    } catch (kvError) {
      console.error('Error updating KV stats in track endpoint:', kvError);
    }
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
    const values = [resolvedEventName, userId || null, resolvedEventData];

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
