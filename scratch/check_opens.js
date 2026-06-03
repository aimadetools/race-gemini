import 'dotenv/config';
import { query } from '../db/index.js';

async function checkOpens() {
  try {
    console.log("Checking opened emails...");
    const res = await query("SELECT * FROM user_events WHERE event_name = 'email_opened' ORDER BY created_at DESC");
    console.log(`Found ${res.rows.length} email opened events:`);
    res.rows.forEach(r => {
      console.log(`- ID: ${r.id}`);
      console.log(`  Created: ${r.created_at}`);
      console.log(`  Event Data:`, r.event_data);
    });
  } catch (error) {
    console.error("Error checking opens:", error);
  }
}

checkOpens();
