import 'dotenv/config'; // Crucial: must be first to load env vars before other imports are evaluated
import { initializeDatabase } from '../db/init.js';
import { createTableUserEvents } from '../db/migrations/create_user_events_table.js';
import { alterUsersAddCreditsConstraint } from '../db/alter-users-add-credits-constraint.js';

async function run() {
  try {
    console.log('Running database migrations...');
    await initializeDatabase();
    await createTableUserEvents();
    await alterUsersAddCreditsConstraint();
    console.log('All migrations executed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    const { pool } = await import('../db/index.js');
    if (pool && typeof pool.end === 'function') {
      await pool.end();
      console.log('Database pool ended.');
    }
  }
}

run();
