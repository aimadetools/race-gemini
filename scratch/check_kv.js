import 'dotenv/config';
import { kv } from '@vercel/kv';

async function run() {
  try {
    const keys = [];
    for await (const key of kv.scanIterator()) {
      keys.push(key);
    }
    console.log('Total keys in Vercel KV:', keys.length);
    console.log('Keys:', keys);

    const inquiries = keys.filter(k => k.startsWith('agency-inquiry:'));
    console.log('Agency inquiries count:', inquiries.length);
    for (const key of inquiries) {
      const data = await kv.get(key);
      console.log(key, '=>', data);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
run();
