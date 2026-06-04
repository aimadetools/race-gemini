import { query } from '../index.js';

export async function addCustomDomainToUsers() {
  const queries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) UNIQUE DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_domain_redirect VARCHAR(500) DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Custom domain columns migration completed successfully.');
  } catch (error) {
    console.error('Error adding custom domain columns to users:', error);
    throw error;
  }
}
