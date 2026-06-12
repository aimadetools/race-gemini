import { query } from '../index.js';

export async function addGbpOauthToUsers() {
  const queries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS gbp_oauth_refresh_token TEXT DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS gbp_oauth_access_token TEXT DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS gbp_oauth_token_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS gbp_account_id VARCHAR(255) DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS gbp_location_id VARCHAR(255) DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Google Business Profile OAuth columns migration completed successfully.');
  } catch (error) {
    console.error('Error adding GBP OAuth columns to users:', error);
    throw error;
  }
}
