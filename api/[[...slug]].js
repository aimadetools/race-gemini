import { kv } from '@vercel/kv';
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');
const { logError } = require('../../lib/logger'); // Import centralized logger

module.exports = async (req, res, currentKvClient) => {
    const currentKv = currentKvClient || kv;
    const { slug } = req.query;

    try { // Added try-catch for main logic

    if (!slug || slug.length !== 2) {
        return res.status(404).send('Not Found');
    }

    const [clientId, fileName] = slug;
    const [serviceSlug, townSlug] = fileName.replace('.html', '').split('-in-');

    const pageIds = await currentKv.smembers(`user:${clientId}:pages`);
    if (!pageIds || pageIds.length === 0) {
        await logError(new Error(`Page IDs not found for client: ${clientId}`), 'Slug Handler - Page IDs Not Found', 'slug_error.log');
        return res.status(404).send('Not Found');
    }

    let pageIdToFind = null;
    for (const pageId of pageIds) {
        const page = await currentKv.hgetall(pageId);
        if (page && slugify(page.service, { lower: true, strict: true }) === serviceSlug && slugify(page.town, { lower: true, strict: true }) === townSlug) {
            pageIdToFind = pageId;
            break;
        }
    }

    if (!pageIdToFind) {
        await logError(new Error(`Page not found for client: ${clientId}, file: ${fileName}`), 'Slug Handler - Specific Page Not Found', 'slug_error.log');
        return res.status(404).send('Not Found');
    }

    const page = await currentKv.hgetall(pageIdToFind);

    if (!page) {
        await logError(new Error(`Page data not found for pageId: ${pageIdToFind}`), 'Slug Handler - Page Data Not Found', 'slug_error.log');
        return res.status(404).send('Not Found');
    }

    let template;
    try {
        template = fs.readFileSync(path.join(process.cwd(), 'page-template.html'), 'utf8');
    } catch (error) {
        console.error('Error reading page template:', error); // Keep console.error here for template loading
        await logError(error, 'Slug Handler - Template Read Error', 'slug_error.log'); // Add centralized logging
        return res.status(500).json({ message: 'Error loading page template.' });
    }

    let pageContent = template.replace(/{{businessName}}/g, page.businessName);
    pageContent = pageContent.replace(/{{service}}/g, page.service);
    pageContent = pageContent.replace(/{{town}}/g, page.town);

    res.setHeader('Content-Type', 'text/html');
    res.send(pageContent);
    } catch (error) { // Catch for main logic
        await logError(error, 'Slug Handler - General Error', 'slug_error.log');
        return res.status(500).json({ message: 'Internal server error.' });
    }
};