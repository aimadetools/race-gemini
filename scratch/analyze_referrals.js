import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

async function analyze() {
  try {
    console.log("=== REFERRAL CLICK-THROUGH CONVERSIONS ANALYSIS ===");
    
    // 1. Clicks statistics
    const clicksRes = await pool.query("SELECT SUM(referral_clicks) as total_clicks, COUNT(CASE WHEN referral_clicks > 0 THEN 1 END) as referrers_with_clicks FROM users");
    const totalClicks = parseInt(clicksRes.rows[0].total_clicks || 0, 10);
    const referrersWithClicks = parseInt(clicksRes.rows[0].referrers_with_clicks || 0, 10);
    console.log(`Total Referral Clicks: ${totalClicks}`);
    console.log(`Referrers with at least 1 click: ${referrersWithClicks}`);

    // 2. Signups statistics
    const signupsRes = await pool.query("SELECT COUNT(*) as total_signups FROM referrals");
    const totalSignups = parseInt(signupsRes.rows[0].total_signups || 0, 10);
    console.log(`Total Referred Signups: ${totalSignups}`);

    // 3. Paid Conversions statistics
    const paidRes = await pool.query("SELECT COUNT(*) as total_paid, SUM(commission_earned) as total_commission FROM referrals WHERE status = 'purchased' OR commission_earned > 0");
    const totalPaid = parseInt(paidRes.rows[0].total_paid || 0, 10);
    const totalCommission = parseFloat(paidRes.rows[0].total_commission || 0);
    console.log(`Total Paid Conversions: ${totalPaid}`);
    console.log(`Total Commission Earned: $${totalCommission.toFixed(2)}`);

    // 4. Conversion Rates
    const clickToSignupRate = totalClicks > 0 ? (totalSignups / totalClicks) * 100 : 0;
    const signupToPaidRate = totalSignups > 0 ? (totalPaid / totalSignups) * 100 : 0;
    const clickToPaidRate = totalClicks > 0 ? (totalPaid / totalClicks) * 100 : 0;

    console.log(`\n--- Conversion Rates ---`);
    console.log(`Click-to-Signup Conversion Rate: ${clickToSignupRate.toFixed(2)}%`);
    console.log(`Signup-to-Paid Conversion Rate: ${signupToPaidRate.toFixed(2)}%`);
    console.log(`Click-to-Paid (Overall) Conversion Rate: ${clickToPaidRate.toFixed(2)}%`);

    // 5. Top referrers analysis
    console.log(`\n--- Top Referrers by Clicks/Signups ---`);
    const topReferrers = await pool.query(`
      SELECT 
        u.id, 
        u.email, 
        u.referral_clicks as clicks, 
        COUNT(r.id) as signups,
        COUNT(CASE WHEN r.status = 'purchased' OR r.commission_earned > 0 THEN 1 END) as paid_conversions,
        SUM(r.commission_earned) as commission
      FROM users u
      LEFT JOIN referrals r ON u.id = r.referrer_id
      WHERE u.referral_clicks > 0 OR r.id IS NOT NULL
      GROUP BY u.id, u.email, u.referral_clicks
      ORDER BY signups DESC, clicks DESC
      LIMIT 10
    `);
    
    console.log(JSON.stringify(topReferrers.rows.map(row => ({
      Email: row.email,
      Clicks: parseInt(row.clicks || 0, 10),
      Signups: parseInt(row.signups || 0, 10),
      Paid: parseInt(row.paid_conversions || 0, 10),
      Commission: "$" + parseFloat(row.commission || 0).toFixed(2),
      'Click-to-Signup %': row.clicks > 0 ? ((row.signups / row.clicks) * 100).toFixed(1) + '%' : '0%'
    })), null, 2));

  } catch (error) {
    console.error("Error during analysis:", error);
  } finally {
    await pool.end();
  }
}

analyze();
