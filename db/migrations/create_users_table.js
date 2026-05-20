import { query } from '../index.js';

export async function createUsersTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      credits INTEGER DEFAULT 0,
      referral_code VARCHAR(255) UNIQUE,
      referrer_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users (referral_code);
    CREATE INDEX IF NOT EXISTS idx_users_referrer_id ON users (referrer_id);
  `;

  try {
    await query(createTableQuery);
    console.log('Table users ensured to exist.');
  } catch (error) {
    console.error('Error ensuring users table:', error);
    throw error;
  }
}
