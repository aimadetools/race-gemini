import 'dotenv/config';
import { initializeDatabase } from '../db/init.js';

async function run() {
  try {
    console.log('Running all database migrations...');
    await initializeDatabase();
    console.log('Migrations finished successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
