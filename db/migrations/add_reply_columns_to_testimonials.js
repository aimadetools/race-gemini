import { query } from '../index.js';

export async function addReplyColumnsToTestimonials() {
  try {
    await query(`
      ALTER TABLE testimonials 
      ADD COLUMN IF NOT EXISTS reply_text TEXT,
      ADD COLUMN IF NOT EXISTS reply_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS google_review_id VARCHAR(255)
    `);
    console.log('Columns reply_text, reply_date, and google_review_id added to testimonials table successfully.');
  } catch (error) {
    console.error('Error adding reply columns to testimonials table:', error);
    throw error;
  }
}
