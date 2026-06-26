import { query } from '../index.js';

export async function createIndexingRetryQueueTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS indexing_retry_queue (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      page_url VARCHAR(500) NOT NULL,
      attempts INTEGER DEFAULT 0,
      last_attempt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT idx_indexing_retry_queue_user_url UNIQUE (user_id, page_url)
    );
  `;

  try {
    await query(createTableQuery);
    console.log('Table indexing_retry_queue ensured to exist.');
  } catch (error) {
    console.error('Error ensuring indexing_retry_queue table:', error);
    throw error;
  }
}
