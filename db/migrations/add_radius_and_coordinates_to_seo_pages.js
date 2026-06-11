import { query } from '../index.js';

export async function addRadiusAndCoordinatesToSeoPages() {
  const queries = [
    'ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS service_radius INTEGER DEFAULT 15',
    'ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS latitude NUMERIC DEFAULT NULL',
    'ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS longitude NUMERIC DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Radius and coordinates columns migration completed successfully.');
  } catch (error) {
    console.error('Error adding radius and coordinates columns to seo_pages:', error);
    throw error;
  }
}
