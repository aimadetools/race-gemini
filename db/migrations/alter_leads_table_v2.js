import { query } from '../index.js';

export async function alterLeadsTableV2() {
  try {
    // Add columns name, phone, message, user_id, page_id to leads table if they do not exist
    await query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS message TEXT,
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS page_id VARCHAR(255)
    `);
    console.log('Columns added to leads table successfully or already exist.');
  } catch (error) {
    console.error('Error altering leads table:', error);
    throw error;
  }
}
