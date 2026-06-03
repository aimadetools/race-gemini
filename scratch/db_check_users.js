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
    // 1. Check users with credits > 5 (default was 50, then 5. Let's list those with credits > 50 or credits not equal to 5 or 50)
    const paidCredits = await pool.query('SELECT COUNT(*) FROM users WHERE credits > 5 AND credits <> 50');
    console.log('Users with credits > 5 (excluding default 50):', paidCredits.rows[0].count);

    // 2. Check active agency subscriptions
    const activeAgencies = await pool.query("SELECT COUNT(*) FROM users WHERE subscription_status = 'active'");
    console.log('Agencies with active subscription:', activeAgencies.rows[0].count);

    // 3. User summary statistics
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const referralSignups = await pool.query('SELECT COUNT(*) FROM users WHERE referrer_id IS NOT NULL');
    console.log('Total users:', totalUsers.rows[0].count);
    console.log('Referral signups:', referralSignups.rows[0].count);

    // 4. Let's list the top users with most credits or active subscription details
    const topUsers = await pool.query(`
      SELECT email, credits, subscription_status, is_agency, referral_code, created_at 
      FROM users 
      ORDER BY credits DESC 
      LIMIT 10
    `);
    console.log('Top 10 users by credits:');
    console.table(topUsers.rows);

    // 5. Let's check some recent users
    const recentUsers = await pool.query(`
      SELECT email, credits, subscription_status, is_agency, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('Recent 5 users:');
    console.table(recentUsers.rows);

  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
