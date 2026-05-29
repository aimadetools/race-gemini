import 'dotenv/config';
import { query } from '../db/index.js';

async function run() {
  try {
    const users = await query('SELECT count(*) as count from users');
    const agencies = await query('SELECT count(*) as count from users WHERE is_agency = true');
    const referrals = await query('SELECT count(*) as count from referrals');
    const seo_pages = await query('SELECT count(*) as count from seo_pages');
    const leads = await query('SELECT count(*) as count from leads');
    
    console.log('--- DATABASE STATUS ---');
    console.log('Total Users:', users.rows[0].count);
    console.log('Agencies:', agencies.rows[0].count);
    console.log('Referrals:', referrals.rows[0].count);
    console.log('SEO Pages:', seo_pages.rows[0].count);
    console.log('Leads:', leads.rows[0].count);

    const latestUsers = await query('SELECT id, email, is_agency, credits, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    console.log('\n--- LATEST USERS ---');
    console.log(latestUsers.rows);

    const latestLeads = await query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 5');
    console.log('\n--- LATEST LEADS ---');
    console.log(latestLeads.rows);

  } catch (err) {
    console.error(err);
  }
  process.exit();
}
run();
