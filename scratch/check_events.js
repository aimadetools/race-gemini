import 'dotenv/config';
import { query } from '../db/index.js';

async function run() {
  try {
    console.log('Querying events...');
    const res = await query('SELECT event_name, COUNT(*) FROM user_events GROUP BY event_name');
    console.log('Event Counts:');
    console.log(res.rows);

    const sample = await query('SELECT * FROM user_events ORDER BY created_at DESC LIMIT 20');
    console.log('\nLast 20 events:');
    console.log(sample.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
