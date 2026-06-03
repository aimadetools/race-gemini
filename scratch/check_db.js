import 'dotenv/config';
import { query } from '../db/index.js';

async function checkRealUsers() {
  try {
    console.log("Checking database for non-test users...");
    const res = await query(`
      SELECT id, email, is_agency, credits, created_at 
      FROM users 
      WHERE email NOT LIKE '%test.com' 
        AND email NOT LIKE '%example.com'
        AND email NOT LIKE '%testuser%'
      ORDER BY created_at DESC
    `);
    console.log(`Found ${res.rows.length} real users:`);
    res.rows.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, IsAgency: ${user.is_agency}, Credits: ${user.credits}, CreatedAt: ${user.created_at}`);
    });

    console.log("\nChecking for real leads...");
    const leadsRes = await query(`
      SELECT id, email, source, created_at 
      FROM leads 
      WHERE email NOT LIKE '%test.com' 
        AND email NOT LIKE '%example.com'
      ORDER BY created_at DESC
    `);
    console.log(`Found ${leadsRes.rows.length} real leads:`);
    leadsRes.rows.forEach(lead => {
      console.log(`- ID: ${lead.id}, Email: ${lead.email}, Source: ${lead.source}, CreatedAt: ${lead.created_at}`);
    });
  } catch (error) {
    console.error("Error checking real users:", error);
  }
}

checkRealUsers();
