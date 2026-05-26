import 'dotenv/config';
import { query } from '../db/index.js';

async function run() {
  try {
    console.log('Querying non-test users...');
    const nonTestUsers = await query(`
      SELECT email, credits, created_at 
      FROM users 
      WHERE email NOT LIKE '%@test.com' AND email NOT LIKE '%@example.com';
    `);
    console.log('Non-test users:', nonTestUsers.rows);

    process.exit(0);
  } catch (err) {
    console.error('Error running stats:', err);
    process.exit(1);
  }
}

run();
