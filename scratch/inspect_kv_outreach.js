import dotenv from 'dotenv';
import { kv } from '@vercel/kv';

dotenv.config({ path: '.env.production' });

async function main() {
  try {
    const keys = await kv.keys('outreach:email:*');
    console.log(`Found ${keys.length} keys:`);
    for (const key of keys) {
      const val = await kv.get(key);
      console.log(`${key} => ${val}`);
    }
  } catch (err) {
    console.error(err);
  }
}
main();
