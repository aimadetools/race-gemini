// db/create-user-events-table.js
import { connectToDatabase } from '../lib/db.js';

async function createUserEventsTable() {
  let client;
  try {
    const pool = await connectToDatabase();
    client = await pool.connect();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_events (
        id SERIAL PRIMARY KEY,
        event_name VARCHAR(255) NOT NULL,
        user_id VARCHAR(255),
        event_data JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createTableQuery);
    console.log('Table "user_events" created or already exists.');
  } catch (error) {
    console.error('Error creating user_events table:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    // It's generally not good practice to exit here in a migration script
    // but for a simple standalone script, it's acceptable.
    process.exit(0); 
  }
}

createUserEventsTable();
