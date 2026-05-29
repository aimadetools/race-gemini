import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { fileName } = req.query;

    if (!fileName) {
        return res.status(400).send('Missing fileName parameter');
    }

    try {
        const result = await query('SELECT content FROM seo_pages WHERE file_name = $1', [fileName]);
        if (result.rows.length === 0) {
            return res.status(404).send('Page Not Found');
        }

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(result.rows[0].content);
    } catch (error) {
        await logError(error, `Error serving page: ${fileName}`);
        return res.status(500).send('Internal Server Error');
    }
};
