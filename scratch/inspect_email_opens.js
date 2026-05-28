import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.production' });
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query("SELECT * FROM user_events WHERE event_name = 'email_opened' ORDER BY created_at DESC;");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
