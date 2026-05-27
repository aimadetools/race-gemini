import { query } from '../index.js';

export async function addAgencyColumnsToUsers() {
  const alterQuery = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_agency BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT NULL;
    ALTER TABLE LOGO_URL_PLACEHOLDER; -- We will execute these individually to handle potential errors gracefully
  `;

  // Standard safe alter queries
  const queries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_agency BOOLEAN DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_color VARCHAR(50) DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT \'inactive\'',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_id INTEGER REFERENCES users(id) ON DELETE SET NULL',
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Agency columns migration completed successfully.');
  } catch (error) {
    console.error('Error adding agency columns to users:', error);
    throw error;
  }
}
