import { query } from '../index.js';

export async function alterSeoPagesUserId() {
  try {
    // Check column type of user_id in seo_pages table
    const res = await query(
      "SELECT data_type FROM information_schema.columns WHERE table_name = 'seo_pages' AND column_name = 'user_id'"
    );
    if (res.rows.length > 0 && res.rows[0].data_type === 'uuid') {
      console.log('Altering user_id column in seo_pages table to INTEGER...');
      await query('ALTER TABLE seo_pages DROP COLUMN IF EXISTS user_id');
      await query('ALTER TABLE seo_pages ADD COLUMN user_id INTEGER');
      console.log('Altered user_id column in seo_pages table successfully.');
    }
  } catch (error) {
    console.error('Error altering user_id column in seo_pages table:', error);
    throw error;
  }
}
