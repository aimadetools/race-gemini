import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

async function inspect() {
  try {
    console.log("--- REAL USERS (non-example.com) ---");
    const realUsers = await pool.query("SELECT * FROM users WHERE email NOT LIKE '%example.com'");
    console.log(`Count: ${realUsers.rows.length}`);
    console.log(realUsers.rows);

    console.log("--- EVENT TYPES ---");
    const events = await pool.query("SELECT event_name, COUNT(*) as count FROM user_events GROUP BY event_name ORDER BY count DESC");
    console.log(events.rows);

    console.log("--- REFERRALS STATISTICS ---");
    const refs = await pool.query("SELECT status, COUNT(*) as count FROM referrals GROUP BY status");
    console.log(refs.rows);

    console.log("--- RECENT USER REGISTRATIONS (non-example) ---");
    const recentUsers = await pool.query("SELECT id, email, is_agency, created_at FROM users WHERE email NOT LIKE '%example.com' ORDER BY created_at DESC LIMIT 10");
    console.log(recentUsers.rows);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

inspect();
