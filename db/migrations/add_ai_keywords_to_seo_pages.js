import { query } from '../index.js';

export async function addAiKeywordsToSeoPages() {
  const queries = [
    'ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS ai_keywords TEXT DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('AI keywords column migration completed successfully.');
  } catch (error) {
    console.error('Error adding AI keywords column to seo_pages:', error);
    throw error;
  }
}
