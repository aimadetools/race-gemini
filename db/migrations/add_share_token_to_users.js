import { query } from '../index.js';
import crypto from 'crypto';

export async function addShareTokenToUsers() {
  try {
    // 1. Add share_token column
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS share_token VARCHAR(255) UNIQUE DEFAULT NULL
    `);
    console.log('Column share_token added to users table successfully or already exists.');

    // 2. Populate share_token for users who do not have one
    const usersWithoutToken = await query('SELECT id FROM users WHERE share_token IS NULL');
    for (const row of usersWithoutToken.rows) {
      const token = crypto.randomBytes(16).toString('hex');
      await query('UPDATE users SET share_token = $1 WHERE id = $2', [token, row.id]);
    }
    console.log(`Populated share_token for ${usersWithoutToken.rows.length} users.`);
  } catch (error) {
    console.error('Error in addShareTokenToUsers migration:', error);
    throw error;
  }
}
