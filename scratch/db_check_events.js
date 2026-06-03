import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  if (!process.env.DATABASE_URL) return;

  try {
    const eventCounts = await pool.query(`
      SELECT event_name, COUNT(*) 
      FROM user_events 
      GROUP BY event_name 
      ORDER BY COUNT(*) DESC
    `);
    console.log('Event types and their counts:');
    console.table(eventCounts.rows);

    const emailOpenEvents = await pool.query(`
      SELECT * 
      FROM user_events 
      WHERE event_name = 'email_open' 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    console.log('Recent email open events:');
    console.log(emailOpenEvents.rows);
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
