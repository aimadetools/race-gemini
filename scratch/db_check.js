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
  console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENT' : 'MISSING');
  if (!process.env.DATABASE_URL) return;

  try {
    const tablesQuery = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public'
    `);
    console.log('Tables in database:', tablesQuery.rows.map(r => r.table_name));

    for (const row of tablesQuery.rows) {
      const countQuery = await pool.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
      console.log(`Table "${row.table_name}" count:`, countQuery.rows[0].count);
    }
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
