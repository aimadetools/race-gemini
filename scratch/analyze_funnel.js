import 'dotenv/config';
import { query } from '../db/index.js';

async function run() {
  try {
    console.log('=== FUNNEL CONVERSION REVIEW ===');

    // 1. Leads counts
    const leadsRes = await query('SELECT COUNT(*) as count FROM leads');
    console.log(`Total Captured Leads (leads table): ${leadsRes.rows[0].count}`);

    // 2. User counts
    const usersRes = await query('SELECT COUNT(*) as count, SUM(CASE WHEN is_agency THEN 1 ELSE 0 END) as agency_count FROM users');
    console.log(`Total Users (users table): ${usersRes.rows[0].count}`);
    console.log(`Agency Users: ${usersRes.rows[0].agency_count}`);

    // 3. User events summary
    const eventsRes = await query('SELECT event_name, COUNT(*) as count FROM user_events GROUP BY event_name ORDER BY count DESC');
    console.log('\nUser Events Breakdown:');
    console.log(eventsRes.rows);

    // 4. Detail on page_view paths
    const pvPathsRes = await query(`
      SELECT 
        COALESCE(event_data->>'path', event_data->>'pageId') as page_path,
        COUNT(*) as count
      FROM user_events
      WHERE event_name = 'page_view'
      GROUP BY page_path
      ORDER BY count DESC
      LIMIT 20;
    `);
    console.log('\nTop 20 Page View Paths:');
    console.log(pvPathsRes.rows);

    // 5. Check if any audit_completed or email_report_sent events exist
    const auditEventsRes = await query(`
      SELECT event_name, COUNT(*) as count
      FROM user_events
      WHERE event_name IN ('audit_completed', 'email_report_sent', 'revenue_generated', 'referral_conversion')
      GROUP BY event_name;
    `);
    console.log('\nSpecific Conversion Events:');
    console.log(auditEventsRes.rows);

    process.exit(0);
  } catch (err) {
    console.error('Error running funnel analysis:', err);
    process.exit(1);
  }
}

run();
