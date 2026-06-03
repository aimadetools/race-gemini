import 'dotenv/config';
import { query } from '../db/index.js';

async function checkEvents() {
  try {
    console.log("Checking user events...");
    const countsRes = await query('SELECT event_name, COUNT(*) FROM user_events GROUP BY event_name ORDER BY count DESC');
    console.log("Event Name Counts:");
    countsRes.rows.forEach(r => {
      console.log(`- ${r.event_name}: ${r.count}`);
    });

    const recentRes = await query('SELECT id, user_id, event_name, event_data, created_at FROM user_events ORDER BY created_at DESC LIMIT 10');
    console.log("\nRecent Events:");
    recentRes.rows.forEach(r => {
      console.log(`- ID: ${r.id}, UserID: ${r.user_id}, Name: ${r.event_name}, Created: ${r.created_at}`);
      console.log(`  Event Data:`, r.event_data);
    });
  } catch (error) {
    console.error("Error checking events:", error);
  }
}

checkEvents();
