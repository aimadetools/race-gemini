import 'dotenv/config';
import { kv } from '@vercel/kv';

const openMessageIds = [
  '83520ed7-dd70-4142-800e-e22a4a142187',
  'f215a72f-2c54-4c9a-9257-0ea1e9c6278e',
  '43f3f867-2373-48ea-b54e-6d4a804e3577',
  '56e9d5e3-c734-4c7e-b4d7-8d3a23159c48',
  'ed955c36-0ec1-4b7f-9e4e-8fd49ef198b0'
];

async function checkKVOpens() {
  try {
    console.log("Checking Vercel KV for opened message IDs...");
    for (const msgId of openMessageIds) {
      const email = await kv.get(`outreach:email:${msgId}`);
      console.log(`- MessageID: ${msgId} -> Email: ${email}`);
    }
  } catch (error) {
    console.error("Error reading from Vercel KV:", error);
  }
}

checkKVOpens();
