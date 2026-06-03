import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  if (!process.env.DATABASE_URL) return;

  try {
    const columnsQuery = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'seo_pages'
    `);
    console.log('Columns in seo_pages:');
    console.table(columnsQuery.rows);

    const pages = await pool.query('SELECT * FROM seo_pages LIMIT 5');
    console.log('Sample seo_pages:');
    console.log(pages.rows);
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
