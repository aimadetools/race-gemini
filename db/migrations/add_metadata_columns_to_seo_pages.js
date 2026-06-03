import { query } from '../index.js';

export async function addMetadataColumnsToSeoPages() {
  try {
    await query(`
      ALTER TABLE seo_pages 
      ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS service VARCHAR(255),
      ADD COLUMN IF NOT EXISTS town VARCHAR(255),
      ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS telephone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS price_range VARCHAR(50),
      ADD COLUMN IF NOT EXISTS opening_hours VARCHAR(255),
      ADD COLUMN IF NOT EXISTS enable_ai_copy BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS ai_style VARCHAR(100)
    `);
    console.log('Metadata columns ensured to exist in seo_pages table.');
  } catch (error) {
    console.error('Error adding metadata columns to seo_pages table:', error);
    throw error;
  }
}
