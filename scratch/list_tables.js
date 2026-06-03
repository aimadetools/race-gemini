import 'dotenv/config';
import { query } from '../db/index.js';

async function listTables() {
  try {
    console.log("Listing database tables...");
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables found:", res.rows.map(r => r.table_name));
  } catch (error) {
    console.error("Error listing tables:", error);
  }
}

listTables();
