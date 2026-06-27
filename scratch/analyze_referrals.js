import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

async function analyze() {
  try {
    const clicksRes = await pool.query("SELECT SUM(referral_clicks) as total_clicks FROM users");
    const totalClicks = parseInt(clicksRes.rows[0].total_clicks || 0, 10);

    const referralsRes = await pool.query("SELECT status, COUNT(*) as count FROM referrals GROUP BY status");
    let totalSignups = 0;
    let totalPurchased = 0;

    for (const row of referralsRes.rows) {
      const count = parseInt(row.count, 10);
      totalSignups += count;
      if (row.status === 'purchased') {
        totalPurchased += count;
      }
    }

    const clickToSignupRate = totalClicks > 0 ? (totalSignups / totalClicks) * 100 : 0;
    const signupToPaidRate = totalSignups > 0 ? (totalPurchased / totalSignups) * 100 : 0;

    console.log("=== REFERRAL CONVERSION METRICS ===");
    console.log(`Total Clicks: ${totalClicks}`);
    console.log(`Total Signups: ${totalSignups}`);
    console.log(`Total Purchases: ${totalPurchased}`);
    console.log(`Click-to-Signup Rate: ${clickToSignupRate.toFixed(2)}%`);
    console.log(`Signup-to-Paid Rate: ${signupToPaidRate.toFixed(2)}%`);
    console.log("===================================");

  } catch (error) {
    console.error("Error running analysis:", error);
  } finally {
    await pool.end();
  }
}

analyze();
