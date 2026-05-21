import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log('Tables in database:');
    for (const row of res.rows) {
      console.log(`- ${row.table_name}`);
      const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1;
      `, [row.table_name]);
      for (const col of cols.rows) {
        console.log(`  * ${col.column_name} (${col.data_type})`);
      }
    }
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
