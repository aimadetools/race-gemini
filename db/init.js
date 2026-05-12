import { pool, query } from './index.js';

async function initializeDatabase() {
  try {
    // Create the users table if it doesn't exist
    await query(`
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
    await query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referrer_id') THEN
              ALTER TABLE users ADD COLUMN referrer_id TEXT;
          END IF;
      END
      $$;
    `);
    console.log('Referrer ID column added to users table if it did not exist.');

    // Add index to email for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    `);
    console.log('Index on users.email created or already exists.');

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end(); // Close the pool after initialization
  }
}

initializeDatabase();
