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
        let html = result.rows[0].content;

        const bannerHtml = `
<div class="demo-banner" style="background: rgba(17, 24, 39, 0.95); color: #fff; padding: 12px 24px; text-align: center; font-family: 'Inter', sans-serif; position: sticky; top: 0; z-index: 99999; border-bottom: 1px solid #374151; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap;">
  <span style="font-size: 0.95rem; font-weight: 500;">
    💡 Live Preview: This is a search-optimized landing page generated for your business. Claim this page and get 50+ towns for a one-time fee of just $49!
  </span>
  <a href="/pricing.html" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #fff; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); transition: transform 0.2s; white-space: nowrap;">
    Claim Your Pages
  </a>
</div>
        `;

        if (html.includes('<body>')) {
            html = html.replace('<body>', `<body>${bannerHtml}`);
        } else if (html.includes('<body >')) {
            html = html.replace('<body >', `<body >${bannerHtml}`);
        } else {
            html = bannerHtml + html;
        }

        return res.status(200).send(html);
    } catch (error) {
        await logError(error, `Error serving page: ${fileName}`);
        return res.status(500).send('Internal Server Error');
    }
};
