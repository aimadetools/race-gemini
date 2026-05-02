import { kv } from '@vercel/kv';

export default async function handler(req, res, currentKvClient) {
  const currentKv = currentKvClient || kv;
  if (req.method === 'GET') {
    try {
      const inquiryKeys = [];
      for await (const key of currentKv.scanIterator({ match: 'agency-inquiry:*' })) {
        inquiryKeys.push(key);
      }

      if (inquiryKeys.length === 0) {
        return res.status(200).json([]);
      }

      const inquiries = await currentKv.mget(...inquiryKeys);
      // The result from mget is an array of strings, so we need to parse each one
      const parsedInquiries = inquiries.map(inquiry => JSON.parse(inquiry));

      res.status(200).json(parsedInquiries);
    } catch (error) {
      console.error('Error fetching agency inquiries from Vercel KV:', error);
      res.status(500).json({ message: 'Failed to fetch agency inquiries.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
