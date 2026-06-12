import { query } from '../index.js';

export async function addIsUnlockedToLeads() {
  try {
    await query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT FALSE
    `);
    console.log('Column is_unlocked added to leads table successfully or already exists.');
  } catch (error) {
    console.error('Error adding is_unlocked to leads table:', error);
    throw error;
  }
}
