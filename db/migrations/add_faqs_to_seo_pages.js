import { query } from '../index.js';

export async function addFaqsToSeoPages() {
  const queries = [
    'ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('FAQs column migration completed successfully.');
  } catch (error) {
    console.error('Error adding FAQs column to seo_pages:', error);
    throw error;
  }
}
