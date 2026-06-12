import { query } from '../index.js';

export async function addGbpSyncToUsers() {
  const queries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS gbp_sync_enabled BOOLEAN DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS gbp_place_id VARCHAR(255) DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS gbp_last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Google Business Profile Sync columns migration completed successfully.');
  } catch (error) {
    console.error('Error adding GBP Sync columns to users:', error);
    throw error;
  }
}
