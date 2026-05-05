import { Pool } from 'pg';

let conn;

async function connectToDatabase() {
  if (conn) return conn;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, 
    },
  });

  // Test the connection
  try {
    await pool.query('SELECT 1');
    console.log('Successfully connected to PostgreSQL database.');
    conn = pool;
    return pool;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL database:', error);
    throw error;
  }
}

export { connectToDatabase };
