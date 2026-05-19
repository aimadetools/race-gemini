import { Pool } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    const databaseSql = fs.readFileSync('database.sql', 'utf8');
    await client.query('DROP TABLE IF EXISTS referrals, users, generated_pages, leads, agencies CASCADE;');
    await client.query(databaseSql);
    console.log('database.sql executed');

    const referralsSql = fs.readFileSync('db/migrations/V3__create_referrals_table.sql', 'utf8');
    await client.query(referralsSql);
    console.log('V3__create_referrals_table.sql executed');
  } finally {
    client.release();
    pool.end();
  }
}

runMigrations().catch(err => {
  console.error(err);
  process.exit(1);
});
