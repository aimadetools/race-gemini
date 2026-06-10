import { query } from '../index.js';

export async function createTestimonialsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_name VARCHAR(255) NOT NULL,
      author_avatar TEXT,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review_text TEXT NOT NULL,
      review_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_testimonials_user_id ON testimonials (user_id);
  `;

  try {
    await query(createTableQuery);
    console.log('Table testimonials ensured to exist.');
  } catch (error) {
    console.error('Error ensuring testimonials table:', error);
    throw error;
  }
}
