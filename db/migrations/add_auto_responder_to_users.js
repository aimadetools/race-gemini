import { query } from '../index.js';

export async function addAutoResponderToUsers() {
  try {
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS auto_responder_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS auto_responder_subject VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS auto_responder_message TEXT DEFAULT NULL
    `);
    console.log('Columns for auto-responder added to users table successfully or already exist.');
  } catch (error) {
    console.error('Error adding auto-responder columns to users table:', error);
    throw error;
  }
}
