import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { logError } from '../lib/logger.js';
import { submitSitemapToSearchEngines } from '../lib/indexing.js';
import { query } from '../db/index.js';

export default async function handler(req, res, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const cookies = parse(req.headers.cookie || '');
    const token = cookies.authToken;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        await logError(error, 'Delete Page - JWT Verification Error', 'delete_page_error.log');
        return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }

    const userId = decoded.userId;
    const { pageId } = req.body;

    if (!pageId) {
        return res.status(400).json({ message: 'Missing required field: pageId' });
    }

    try {
        const pageResult = await query(
            'SELECT id, user_id FROM seo_pages WHERE id = $1',
            [pageId]
        );
        if (pageResult.rows.length === 0) {
            return res.status(404).json({ message: 'Page not found.' });
        }

        const pageRow = pageResult.rows[0];
        
        // Verify user owns the page
        if (pageRow.user_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized. You do not own this page.' });
        }

        // Delete page from PostgreSQL
        await query('DELETE FROM seo_pages WHERE id = $1', [pageId]);

        // Delete view counts and unique visitor sets
        await currentKv.del(`page:${pageId}:views`);
        await currentKv.del(`page:${pageId}:unique_visitors`);

        // Submit updated sitemap
        try {
            await submitSitemapToSearchEngines(userId, req);
        } catch (sitemapError) {
            await logError(sitemapError, 'Delete Page - Sitemap Submit Error', 'delete_page_error.log');
        }

        return res.status(200).json({ message: 'Page deleted successfully.' });
    } catch (error) {
        await logError(error, 'Delete Page - General Error', 'delete_page_error.log');
        return res.status(500).json({ message: 'Internal server error.' });
    }
}
