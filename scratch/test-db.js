import 'dotenv/config';
import { query } from '../db/index.js';
console.log('Attempting to query database...');
try {
  const res = await query('SELECT NOW()');
  console.log('Database query success:', res.rows);
} catch (err) {
  console.error('Database query failed:', err);
}
