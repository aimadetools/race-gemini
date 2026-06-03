import { query } from '../db/index.js';

async function run() {
  try {
    const userCount = await query('SELECT COUNT(*) FROM users');
    const agencyUserCount = await query('SELECT COUNT(*) FROM users WHERE is_agency = true');
    const agencyInquiryCount = await query('SELECT COUNT(*) FROM agency_inquiries');
    const leadCount = await query('SELECT COUNT(*) FROM leads');
    const pageCount = await query('SELECT COUNT(*) FROM seo_pages');
    
    console.log('=== Database Status ===');
    console.log('Total Users (Including Agencies):', userCount.rows[0].count);
    console.log('Total Agency Users (is_agency = true):', agencyUserCount.rows[0].count);
    console.log('Total Agency Inquiries:', agencyInquiryCount.rows[0].count);
    console.log('Total Leads:', leadCount.rows[0].count);
    console.log('Total SEO Pages:', pageCount.rows[0].count);
    
    // Check recent user events
    const eventCount = await query('SELECT COUNT(*) FROM user_events');
    console.log('Total User Events:', eventCount.rows[0].count);
    
    const events = await query('SELECT event_name, COUNT(*) FROM user_events GROUP BY event_name');
    console.log('\n=== User Events Grouped ===');
    console.dir(events.rows);

  } catch (error) {
    console.error('Error running status check:', error);
  }
}

run();
