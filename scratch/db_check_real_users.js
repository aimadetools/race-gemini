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
    const nonTestUsers = await pool.query(`
      SELECT email, credits, subscription_status, is_agency, created_at 
      FROM users 
      WHERE email NOT LIKE '%@example.com' 
        AND email NOT LIKE '%@test.com'
        AND email NOT LIKE '%@test.org'
        AND email NOT LIKE '%@tester.com'
      LIMIT 50
    `);
    console.log('Non-test users count:', nonTestUsers.rows.length);
    if (nonTestUsers.rows.length > 0) {
      console.table(nonTestUsers.rows);
    }
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
