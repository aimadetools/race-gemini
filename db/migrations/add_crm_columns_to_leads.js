import { query } from '../index.js';

export async function addCrmColumnsToLeads() {
  try {
    await query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'New',
      ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''
    `);
    console.log('CRM columns (status, notes) added to leads table successfully or already exist.');
  } catch (error) {
    console.error('Error adding CRM columns to leads table:', error);
    throw error;
  }
}
