import { query } from '../index.js';

export async function createSeoPagesTable() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS seo_pages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      file_name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      content TEXT NOT NULL,
      user_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndexesSql = `
    CREATE INDEX IF NOT EXISTS idx_seo_pages_slug ON seo_pages (slug);
    CREATE INDEX IF NOT EXISTS idx_seo_pages_user_id ON seo_pages (user_id);
  `;

  try {
    await query(createTableSql);
    console.log('Table seo_pages ensured to exist.');
    
    await query(createIndexesSql);
    console.log('Indexes for seo_pages created or already exist.');

  } catch (error) {
    console.error('Error ensuring seo_pages table:', error);
    throw error;
  }
}

