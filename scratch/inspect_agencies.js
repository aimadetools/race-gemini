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
    const res = await pool.query("SELECT id, email, name, subscription_status, created_at FROM users WHERE is_agency = true ORDER BY created_at DESC;");
    console.log("=== AGENCIES ===");
    console.log(JSON.stringify(res.rows, null, 2));

    const resInquiries = await pool.query("SELECT * FROM user_events WHERE event_name LIKE '%inquiry%' OR event_name LIKE '%agency%' ORDER BY created_at DESC;");
    console.log("\n=== INQUIRIES & AGENCY EVENTS ===");
    console.log(JSON.stringify(resInquiries.rows, null, 2));

    const resLeads = await pool.query("SELECT * FROM leads ORDER BY created_at DESC;");
    console.log("\n=== LEADS ===");
    console.log(JSON.stringify(resLeads.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
