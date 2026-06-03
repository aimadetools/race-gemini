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
    const columnsQuery = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_events'
    `);
    console.log('Columns in user_events:');
    console.table(columnsQuery.rows);

    const emailOpenEvents = await pool.query(`
      SELECT * 
      FROM user_events 
      WHERE event_name = 'email_opened'
    `);
    console.log('Email opened events:');
    console.log(emailOpenEvents.rows);
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
