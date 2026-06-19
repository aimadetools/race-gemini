import { query } from '../index.js';

export async function createKeywordRankingsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS keyword_rankings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      keyword VARCHAR(255) NOT NULL,
      town VARCHAR(255) NOT NULL,
      service VARCHAR(255) NOT NULL,
      rank INTEGER,
      previous_rank INTEGER,
      last_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Indexing for faster lookups
  await query(`
    CREATE INDEX IF NOT EXISTS idx_keyword_rankings_user_id ON keyword_rankings(user_id);
  `);
}
