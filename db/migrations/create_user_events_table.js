import { query } from '../index.js';

export async function createTableUserEvents() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS user_events (
      id SERIAL PRIMARY KEY,
      event_name VARCHAR(255) NOT NULL,
      user_id VARCHAR(255),
      event_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE user_events ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  `;

  try {
    await query(createTableQuery);
    console.log('Table user_events ensured to exist with timestamp and created_at columns.');
  } catch (error) {
    console.error('Error ensuring user_events table:', error);
    throw error;
  }
}
