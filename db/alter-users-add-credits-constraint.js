import { connectToDatabase } from '../lib/db.js';

export async function alterUsersAddCreditsConstraint() {
  let client;
  try {
    const pool = await connectToDatabase();
    client = await pool.connect();
    
    // Add NOT NULL constraint and set default to 0 for 'credits' column if it doesn't exist
    // This is important for data integrity, ensuring all users have a credit balance.
    await client.query(`
      DO $$
      BEGIN
          -- Check if the 'credits' column exists before trying to alter it
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='credits') THEN
              -- Ensure existing null values are updated to 0 before adding NOT NULL constraint
              UPDATE users SET credits = 0 WHERE credits IS NULL;
              
              -- Add NOT NULL constraint and set default to 0
              ALTER TABLE users ALTER COLUMN credits SET DEFAULT 0;
              ALTER TABLE users ALTER COLUMN credits SET NOT NULL;
              
              RAISE NOTICE 'Column "credits" in table "users" altered to SET NOT NULL and SET DEFAULT 0.';
          ELSE
              RAISE NOTICE 'Column "credits" in table "users" does not exist. No action taken.';
          END IF;
      END
      $$;
    `);
    console.log('Ensured "credits" column in "users" table has NOT NULL constraint and DEFAULT 0.');
  } catch (error) {
    console.error('Error altering users table for credits constraint:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}
