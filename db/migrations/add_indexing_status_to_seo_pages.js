import { query } from '../index.js';

export async function addIndexingStatusToSeoPages() {
  const queries = [
    "ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS indexing_status VARCHAR(100) DEFAULT 'unknown'",
    "ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS last_indexing_check TIMESTAMP WITH TIME ZONE DEFAULT NULL"
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Indexing status columns migration completed successfully.');
  } catch (error) {
    console.error('Error adding indexing status columns to seo_pages:', error);
    throw error;
  }
}
