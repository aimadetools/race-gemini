import { query } from '../index.js';

export async function addExternalReviewLinksToUsers() {
  const queries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS google_review_link TEXT DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_review_link TEXT DEFAULT NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS yelp_review_link TEXT DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('External review links column migration completed successfully.');
  } catch (error) {
    console.error('Error adding external review links columns to users:', error);
    throw error;
  }
}
