import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';
import { parse, serialize } from 'cookie';
import fs from 'fs';
import path from 'path';

async function logError(error, context) {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFilePath = path.join(logDir, 'track_error.log'); // Separate log file for tracking errors
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] Context: ${context}
Error: ${error.message}
Stack: ${error.stack}

`;
  fs.appendFileSync(logFilePath, errorMessage);
}

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { pageId, eventType = 'page_view', elementId } = req.body;

            if (!pageId) {
                await logError(new Error('Missing pageId in request body.'), 'Tracking - Validation');
                return res.status(400).json({ message: 'Missing pageId.' });
            }

            const baseKey = `page:${pageId}`;
            
            // Track total views/events for the page
            await kv.incr(`${baseKey}:views`);

            // If an eventType is provided, track it specifically
            if (eventType !== 'page_view') {
                const eventKey = `${baseKey}:events:${eventType}`;
                await kv.incr(eventKey);
                if (elementId) {
                    await kv.incr(`${eventKey}:${elementId}`);
                }
            }

            // Handle unique visitors using a cookie
            const cookies = parse(req.headers.cookie || '');
            let visitorId = cookies.visitorId;

            if (!visitorId) {
                visitorId = uuidv4();
                // Set visitorId cookie for 1 year
                res.setHeader('Set-Cookie', serialize('visitorId', visitorId, {
                    httpOnly: true,
                    maxAge: 60 * 60 * 24 * 365, // 1 year
                    path: '/',
                    sameSite: 'lax',
                    secure: process.env.NODE_ENV === 'production',
                }));
            }

            // Add visitorId to a set for unique visitors for this page
            const isNewVisitor = await kv.sadd(`page:${pageId}:unique_visitors`, visitorId);

            res.status(200).json({ message: 'Tracking data recorded.' });

        } catch (error) {
            await logError(error, 'Tracking - General Error');
            res.status(500).json({ message: 'Internal server error.' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
