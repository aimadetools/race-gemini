import 'dotenv/config';
import { kv } from '@vercel/kv';

async function run() {
  try {
    console.log('Fetching Vercel KV keys...');
    // We can scan or get keys
    const keys = await kv.keys('page:*');
    console.log('KV Keys:', keys);
    
    for (const key of keys) {
      const type = await kv.type(key);
      if (type === 'string') {
        const val = await kv.get(key);
        console.log(`${key} (string): ${val}`);
      } else if (type === 'set') {
        const members = await kv.smembers(key);
        console.log(`${key} (set count): ${members.length}`);
        console.log(`${key} (set sample):`, members.slice(0, 5));
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
run();
