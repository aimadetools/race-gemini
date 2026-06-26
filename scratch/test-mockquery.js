import { mockQuery, addMockLead, clearMockLeads } from '../db/mockDb.js';

async function test() {
    clearMockLeads();
    addMockLead({ id: 456, user_id: 111, name: 'John Doe', is_unlocked: false });
    const res = await mockQuery('SELECT user_id, name FROM leads WHERE id = $1', [456]);
    console.log('Result:', JSON.stringify(res));
}

test();
