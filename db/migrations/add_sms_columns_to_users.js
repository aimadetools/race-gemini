import { query } from '../index.js';

export async function addSmsColumnsToUsers() {
  const queries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_phone VARCHAR(50) DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('SMS columns migration completed successfully.');
  } catch (error) {
    console.error('Error adding SMS columns to users:', error);
    throw error;
  }
}
