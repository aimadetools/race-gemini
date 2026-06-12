import { query } from '../index.js';

export async function addGoogleVerificationCodeToUsers() {
  const queries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS google_verification_code VARCHAR(100) DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Google Verification Code column migration completed successfully.');
  } catch (error) {
    console.error('Error adding Google Verification Code column to users:', error);
    throw error;
  }
}
