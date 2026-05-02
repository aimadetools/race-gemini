import { kv } from '@vercel/kv';
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res, currentKvClient) => {
    const currentKv = currentKvClient || kv;
    const { slug } = req.query;

    if (!slug || slug.length !== 2) {
        return res.status(404).send('Not Found');
    }

    const [clientId, fileName] = slug;
    const [serviceSlug, townSlug] = fileName.replace('.html', '').split('-in-');

    const pageIds = await currentKv.smembers(`user:${clientId}:pages`);
    if (!pageIds || pageIds.length === 0) {
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
        return res.status(404).send('Not Found');
    }

    const page = await currentKv.hgetall(pageIdToFind);

    if (!page) {
        return res.status(404).send('Not Found');
    }

    let template;
    try {
        template = fs.readFileSync(path.join(process.cwd(), 'page-template.html'), 'utf8');
    } catch (error) {
        console.error('Error reading page template:', error);
        return res.status(500).json({ message: 'Error loading page template.' });
    }

    let pageContent = template.replace(/{{businessName}}/g, page.businessName);
    pageContent = pageContent.replace(/{{service}}/g, page.service);
    pageContent = pageContent.replace(/{{town}}/g, page.town);

    res.setHeader('Content-Type', 'text/html');
    res.send(pageContent);
};