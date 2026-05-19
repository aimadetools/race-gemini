-- Add a referral_code column to the users table
ALTER TABLE users ADD COLUMN referral_code VARCHAR(255) UNIQUE;

-- Create a table to track referrals
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER REFERENCES users(id),
  referred_id INTEGER REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'signed_up', -- e.g., 'signed_up', 'purchased'
  commission_earned NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index for faster lookups
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
