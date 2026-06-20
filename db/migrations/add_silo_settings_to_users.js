import { query } from '../index.js';

export async function addSiloSettingsToUsers() {
  try {
    // 1. Add silo_type column if it doesn't exist
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS silo_type VARCHAR(50) DEFAULT 'proximity'
    `);
    console.log('Column silo_type added to users table successfully or already exists.');

    // 2. Add silo_limit column if it doesn't exist
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS silo_limit INTEGER DEFAULT 5
    `);
    console.log('Column silo_limit added to users table successfully or already exists.');
  } catch (error) {
    console.error('Error in addSiloSettingsToUsers migration:', error);
    throw error;
  }
}
