import { query } from '../index.js';

export async function addWeeklyReportEnabledToUsers() {
  try {
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN DEFAULT TRUE
    `);
    console.log('Column weekly_report_enabled added to users table successfully or already exists.');
  } catch (error) {
    console.error('Error adding weekly_report_enabled to users table:', error);
    throw error;
  }
}
