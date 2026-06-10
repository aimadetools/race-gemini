import { query } from '../index.js';

export async function addStripeCustomerIdToUsers() {
  const queries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Stripe customer ID column migration completed successfully.');
  } catch (error) {
    console.error('Error adding Stripe customer ID column to users:', error);
    throw error;
  }
}
