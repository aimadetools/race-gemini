import { query } from '../index.js';

export async function addReportFrequencyToUsers() {
  try {
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS report_frequency VARCHAR(50) DEFAULT 'weekly'
    `);
    console.log('Column report_frequency added to users table successfully or already exists.');
  } catch (error) {
    console.error('Error adding report_frequency to users table:', error);
    throw error;
  }
}
