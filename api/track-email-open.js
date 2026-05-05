// api/track-email-open.js
import { connectToDatabase } from '../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const { emailId } = req.query;

  if (!emailId) {
    // Return a 1x1 transparent GIF even if emailId is missing,
    // to avoid broken image icons in emails.
    const transparentGif = Buffer.from(
      'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
      'base64'
    );
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Length', transparentGif.length);
    return res.send(transparentGif);
  }

  let client;
  try {
    const pool = await connectToDatabase();
    client = await pool.connect();

    const query = `
      INSERT INTO user_events(event_name, event_data)
      VALUES($1, $2)
      RETURNING *;
    `;
    const values = ['email_open', { emailId }];

    await client.query(query, values);

    // Send back a 1x1 transparent GIF
    const transparentGif = Buffer.from(
      'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
      'base64'
    );
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Length', transparentGif.length);
    return res.send(transparentGif);

  } catch (error) {
    console.error('Error tracking email open:', error);
    // Even on error, send a transparent GIF to avoid broken image display
    const transparentGif = Buffer.from(
      'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
      'base64'
    );
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Length', transparentGif.length);
    return res.send(transparentGif);
  } finally {
    if (client) {
      client.release();
    }
  }
}
