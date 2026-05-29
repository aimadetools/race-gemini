import { query } from '../index.js';

export async function createReferralsAndAlterUsers() {
  const createReferralsQuery = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(255) UNIQUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_clicks INTEGER DEFAULT 0;

    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER REFERENCES users(id),
      referred_id INTEGER REFERENCES users(id),
      status VARCHAR(50) DEFAULT 'signed_up', -- e.g., 'signed_up', 'purchased'
      commission_earned NUMERIC(10, 2) DEFAULT 0.00,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
  `;

  try {
    await query(createReferralsQuery);
    console.log('Table referrals ensured to exist and users table altered with referral_code and referral_clicks.');
  } catch (error) {
    console.error('Error ensuring referrals table and altering users table:', error);
    throw error;
  }
}
