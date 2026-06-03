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
    const popularPages = await pool.query(`
      SELECT event_data->>'path' AS path, COUNT(*) 
      FROM user_events 
      WHERE event_name = 'page_view' 
        AND event_data->>'path' NOT IN (
          '/agency-login.html', '/agency-signup.html', '/auth.html', '/agency-dashboard.html',
          '/forgot-password.html', '/reset-password.html', '/agency-billing.html', '/agency-white-label.html'
        )
      GROUP BY event_data->>'path' 
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `);
    console.log('Most viewed public pages:');
    console.table(popularPages.rows);
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
