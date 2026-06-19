import { query } from '../index.js';

export async function addAgencyDirectoryIdToLeads() {
  try {
    await query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS agency_directory_id INTEGER REFERENCES agency_directory(id) ON DELETE SET NULL
    `);
    console.log('Column agency_directory_id added to leads table successfully or already exists.');
  } catch (error) {
    console.error('Error adding agency_directory_id to leads table:', error);
    throw error;
  }
}
