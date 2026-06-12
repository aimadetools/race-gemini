import { query } from '../index.js';

export async function addBusinessProfileToUsers() {
  const queries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS business_profile JSONB DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Business Profile column migration completed successfully.');
  } catch (error) {
    console.error('Error adding business_profile column to users:', error);
    throw error;
  }
}
