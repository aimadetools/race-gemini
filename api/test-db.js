import { query } from '../db/index.js';

export default async function handler(req, res) {
  try {
    // 1. List all tables
    const tablesRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);

    const schemaInfo = {};

    // 2. For each table, list columns and types
    for (const table of tables) {
      const colsRes = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
      `, [table]);
      schemaInfo[table] = colsRes.rows;
    }

    return res.status(200).json({ tables, schemaInfo });
  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
