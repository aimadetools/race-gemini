import { initializeDatabase } from '../db/init.js';
import { createTableUserEvents } from '../db/migrations/create_user_events_table.js';
import { alterUsersAddCreditsConstraint } from '../db/alter-users-add-credits-constraint.js';
import { pool } from '../db/index.js';

async function run() {
  try {
    console.log('Starting DB migration run...');
    await initializeDatabase();
    await createTableUserEvents();
    await alterUsersAddCreditsConstraint();
    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

run();
