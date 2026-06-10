import { query } from '../index.js';

export async function addPrimaryColorToSeoPages() {
  const queries = [
    'ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS primary_color VARCHAR(50) DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Primary color column migration completed successfully.');
  } catch (error) {
    console.error('Error adding primary color column to seo_pages:', error);
    throw error;
  }
}
