import { query } from '../index.js';

export async function createLeadsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      url VARCHAR(255),
      source VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);
  `;

  try {
    await query(createTableQuery);
    console.log('Table leads ensured to exist.');
  } catch (error) {
    console.error('Error ensuring leads table:', error);
    throw error;
  }
}
