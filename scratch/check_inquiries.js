import 'dotenv/config';
import { query } from '../db/index.js';

async function checkInquiries() {
  try {
    console.log("Checking agency inquiries...");
    const res = await query('SELECT * FROM agency_inquiries ORDER BY created_at DESC');
    console.log(`Found ${res.rows.length} agency inquiries:`);
    res.rows.forEach(inquiry => {
      console.log(`- ID: ${inquiry.id}`);
      console.log(`  Agency: ${inquiry.agency_name}`);
      console.log(`  Website: ${inquiry.website}`);
      console.log(`  Contact: ${inquiry.contact_person} (${inquiry.contact_email})`);
      console.log(`  Phone: ${inquiry.phone_number}`);
      console.log(`  Client Volume: ${inquiry.client_volume}`);
      console.log(`  Message: ${inquiry.message}`);
      console.log(`  Created: ${inquiry.created_at}`);
      console.log('---');
    });
  } catch (error) {
    console.error("Error checking inquiries:", error);
  }
}

checkInquiries();
