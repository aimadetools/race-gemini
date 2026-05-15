export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Temporarily disabling database tracking for user events
  // The 'user_events' table does not exist and needs to be created,
  // or the tracking code needs to be re-evaluated for its necessity at this stage.
  // For now, we will just return a success message to prevent errors.

  // const { eventName, userId, eventData } = req.body;

  // if (!eventName) {
  //   return res.status(400).json({ message: 'eventName is required.' });
  // }

  // let client;
  // try {
  //   const pool = await connectToDatabase();
  //   client = await pool.connect();

  //   const query = `
  //     INSERT INTO user_events(event_name, user_id, event_data)
  //     VALUES($1, $2, $3)
  //     RETURNING *;
  //   `;
  //   const values = [eventName, userId || null, eventData || null];

  //   await client.query(query, values);

  //   return res.status(200).json({ message: 'Event tracked successfully.' });

  // } catch (error) {
  //   console.error('Error tracking event:', error);
  //   return res.status(500).json({ message: 'Internal Server Error' });
  // } finally {
  //   if (client) {
  //     client.release();
  //   }
  // }
  
  // Return success directly
  return res.status(200).json({ message: 'Event tracking temporarily disabled.' });
}

