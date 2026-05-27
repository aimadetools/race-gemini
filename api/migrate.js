import { initializeDatabase } from '../db/init.js';
import { createTableUserEvents } from '../db/migrations/create_user_events_table.js';
import { alterUsersAddCreditsConstraint } from '../db/alter-users-add-credits-constraint.js';
import { pool } from '../db/index.js'; // Corrected import path for pool

export default async function handler(req, res) {
  // In a production environment, this should be secured (e.g., via a secret token or IP whitelist)
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const secret = req.query.secret || req.headers['x-migration-secret'];
  if (!process.env.MIGRATION_SECRET) {
    console.warn(
      'MIGRATION_SECRET environment variable is not set. Unauthorized access attempt to migration endpoint.'
    );
    return res
      .status(401)
      .json({ message: 'Unauthorized: MIGRATION_SECRET not configured' });
  }

  if (secret !== process.env.MIGRATION_SECRET) {
    console.warn(
      'Unauthorized access attempt to migration endpoint: invalid token provided.'
    );
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }

  try {
    console.log('Attempting to run database migrations...');
    await initializeDatabase();
    console.log(
      'Database initialized successfully, ensuring referrer_id column exists.'
    );

    await createTableUserEvents();
    console.log('Ensured user_events table exists.');

    await alterUsersAddCreditsConstraint();
    console.log(
      'Ensured "credits" column in "users" table has NOT NULL constraint and DEFAULT 0.'
    );
    return res
      .status(200)
      .json({ message: 'Database migrations completed successfully.' });
  } catch (error) {
    console.error('Error running database migrations:', error);
    return res.status(500).json({
      message: 'Error running database migrations',
      error: error.message,
    });
  } finally {
    // For Vercel serverless functions, the function will die after execution.
    // The pool connections are managed by individual migration functions which release their clients.
    // Explicitly ending the pool here is generally not needed for serverless functions,
    // as the environment cleans up. For long-running processes, pool.end() would be called on shutdown.
  }
}
