import dotenv from 'dotenv';
dotenv.config();

import { initializeDatabase } from '../db/init.js';
import { createTableUserEvents } from '../db/migrations/create_user_events_table.js';
import { alterUsersAddCreditsConstraint } from '../db/alter-users-add-credits-constraint.js';
import { pool } from '../db/index.js';

async function main() {
  try {
    console.log('Running database migrations...');
    await initializeDatabase();
    console.log('Ensured core database schemas exist.');

    await createTableUserEvents();
    console.log('Ensured user_events table exists.');

    await alterUsersAddCreditsConstraint();
    console.log('Ensured credits constraint exists.');

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    if (pool && typeof pool.end === 'function') {
      await pool.end();
      console.log('Database pool ended.');
    }
  }
}

main();
