import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.production' });
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('=== OVERALL EVENT COUNTS ===');
    const resCount = await pool.query('SELECT event_name, count(*) FROM user_events GROUP BY event_name ORDER BY count DESC;');
    console.log(resCount.rows);

    console.log('\n=== PAGE VIEW PATH COUNTS ===');
    const resPaths = await pool.query(`
      SELECT event_data->>'path' as path, count(*) 
      FROM user_events 
      WHERE event_name = 'page_view' 
      GROUP BY path 
      ORDER BY count DESC;
    `);
    console.log(resPaths.rows);

    console.log('\n=== PAGE VIEW PAGEID COUNTS ===');
    const resPageIds = await pool.query(`
      SELECT event_data->>'pageId' as pageId, count(*) 
      FROM user_events 
      WHERE event_name = 'page_view' 
      GROUP BY pageId 
      ORDER BY count DESC;
    `);
    console.log(resPageIds.rows);

    console.log('\n=== BUTTON CLICK ELEMENTS ===');
    const resButtons = await pool.query(`
      SELECT event_data->>'elementId' as elementId, count(*) 
      FROM user_events 
      WHERE event_name = 'button_click' 
      GROUP BY elementId 
      ORDER BY count DESC;
    `);
    console.log(resButtons.rows);

    console.log('\n=== AUDIT COMPLETED EVENTS ===');
    const resAudit = await pool.query(`
      SELECT count(*) FROM user_events WHERE event_name = 'audit_completed';
    `);
    console.log('Total audits completed:', resAudit.rows[0].count);

    console.log('\n=== EMAIL REPORT SENT EVENTS ===');
    const resReport = await pool.query(`
      SELECT count(*) FROM user_events WHERE event_name = 'email_report_sent';
    `);
    console.log('Total email reports sent:', resReport.rows[0].count);

    console.log('\n=== AGENCY SIGNUP & INQUIRIES ===');
    const resAgencies = await pool.query('SELECT count(*) FROM agencies;');
    console.log('Total agencies:', resAgencies.rows[0].count);
    const resInquiries = await pool.query(`
      SELECT event_name, count(*) FROM user_events WHERE event_name LIKE '%agency%' OR event_name LIKE '%inquiry%' GROUP BY event_name;
    `);
    console.log('Agency/Inquiry event counts:', resInquiries.rows);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}
main();
