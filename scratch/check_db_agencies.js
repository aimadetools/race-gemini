import 'dotenv/config';
import { query } from '../db/index.js';

async function run() {
  try {
    console.log('Querying users...');
    const res = await query('SELECT id, email, is_agency, name, created_at, agency_id FROM users ORDER BY created_at DESC');
    console.log(`Found ${res.rows.length} total users:`);
    console.log(res.rows);

    const agencies = res.rows.filter(r => r.is_agency);
    console.log(`\nFound ${agencies.length} agencies:`);
    console.log(agencies);
    process.exit(0);
  } catch (err) {
    console.error('Error querying users:', err);
    process.exit(1);
  }
}

run();
