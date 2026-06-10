import { query } from '../index.js';

export async function addWidgetCssToUsers() {
  const queries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS widget_css TEXT DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Widget CSS column migration completed successfully.');
  } catch (error) {
    console.error('Error adding Widget CSS column to users:', error);
    throw error;
  }
}
