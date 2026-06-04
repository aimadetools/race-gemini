import { query } from '../index.js';

export async function addWebhookAndTrackingColumnsToUsers() {
  const queries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_url VARCHAR(500) DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS ga_tracking_id VARCHAR(100) DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS fb_pixel_id VARCHAR(100) DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Webhook and Tracking columns migration completed successfully.');
  } catch (error) {
    console.error('Error adding webhook and tracking columns to users:', error);
    throw error;
  }
}
