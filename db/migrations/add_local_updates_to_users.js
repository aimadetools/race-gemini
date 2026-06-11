import { query } from '../index.js';

export async function addLocalUpdatesToUsers() {
  const queries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS announcement_text TEXT DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS announcement_type VARCHAR(50) DEFAULT \'news\'',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS announcement_coupon_code VARCHAR(50) DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS announcement_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS announcement_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Local updates columns migration completed successfully.');
  } catch (error) {
    console.error('Error adding local updates columns to users:', error);
    throw error;
  }
}
