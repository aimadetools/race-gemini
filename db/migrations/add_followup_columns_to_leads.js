import { query } from '../index.js';

export async function addFollowupColumnsToLeads() {
  const queries = [
    'ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_followup_step INTEGER DEFAULT 0',
    'ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMP WITH TIME ZONE DEFAULT NULL'
  ];

  try {
    for (const q of queries) {
      await query(q);
    }
    console.log('Follow-up columns migration on leads table completed successfully.');
  } catch (error) {
    console.error('Error adding follow-up columns to leads:', error);
    throw error;
  }
}
