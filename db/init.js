import { pool, query } from './index.js';
import { createUserEventsTable } from './create-user-events-table.js';

export async function initializeDatabase() {
  let client;
  try {
    client = await pool.connect();
    // Create the users table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          hashed_password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          credits INTEGER DEFAULT 0,
          referrer_id TEXT DEFAULT NULL
      );
    `);
    console.log('Users table created or already exists.');

    // Check if referrer_id column exists, if not, add it
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referrer_id') THEN
              ALTER TABLE users ADD COLUMN referrer_id TEXT;
          END IF;
      END
      $$;
    `);
    console.log('Referrer ID column added to users table if it did not exist.');

    // Create the user_events table
    await createUserEventsTable();

    // Add index to email for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    `);
    console.log('Index on users.email created or already exists.');

  } catch (error) {
    console.error('Error initializing database:', error);
    throw error; // Re-throw to be caught by the caller
  } finally {
    if (client) {
      client.release();
    }
  }
}

