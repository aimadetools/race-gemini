import { createTableUserEvents } from './db/migrations/create_user_events_table.js';
import { createUsersTable } from './db/migrations/create_users_table.js'; // Import the new users table migration
import { createReferralsAndAlterUsers } from './db/migrations/create_referrals_and_update_users.js';
import { Pool } from 'pg'; // This import is actually not needed if using db/index.js global pool

async function runLocalMigration() {
  // We no longer need to mock databaseUrl. db/index.js will pick up process.env.DATABASE_URL
  // The pool in db/index.js is already configured to use process.env.DATABASE_URL
  // So, we don't need to manually create a new pool or override process.env.DATABASE_URL here.
  // We just need to ensure process.env.DATABASE_URL is set in the environment where this script is run.

  try {
    console.log('Attempting to run database migrations for user_events...');
    await createTableUserEvents();
    console.log('Local migration for user_events table completed successfully.');

    console.log('Attempting to run database migrations for users table...');
    await createUsersTable(); // Call the new users table migration FIRST
    console.log('Local migration for users table completed successfully.');

    console.log('Attempting to run database migrations for referrals table and altering users table...');
    await createReferralsAndAlterUsers();
    console.log('Local migration for referrals table and altering users table completed successfully.');
  } catch (error) {
    console.error('Error during local migration:', error);
    process.exit(1);
  } finally {
    // This is important to ensure the process exits gracefully
    // and doesn't keep the database connection open
    const { pool } = await import('./db/index.js');
    // Only end the pool if it was created and is still active.
    // In a serverless environment, this might not be necessary as the process dies.
    // For a local script, it's good practice.
    if (pool && pool._clients.length > 0) { // Check if there are active clients in the pool
      await pool.end();
      console.log('Database pool ended.');
    }
  }
}

runLocalMigration();
