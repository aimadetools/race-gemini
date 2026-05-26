import 'dotenv/config';
import { kv } from '@vercel/kv';

async function run() {
  try {
    console.log('Scanning for agency-inquiry:* keys...');
    const inquiryKeys = [];
    for await (const key of kv.scanIterator({ match: 'agency-inquiry:*' })) {
      inquiryKeys.push(key);
    }
    console.log('Found inquiry keys:', inquiryKeys);

    if (inquiryKeys.length > 0) {
      const inquiries = await kv.mget(...inquiryKeys);
      const parsedInquiries = inquiries.map(inquiry => JSON.parse(inquiry));
      console.log('Inquiries:', parsedInquiries);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error checking KV inquiries:', err);
    process.exit(1);
  }
}

run();
