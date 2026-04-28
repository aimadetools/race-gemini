const { kv } = require('@vercel/kv');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const slugify = require('slugify');

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ message: 'Client ID is required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const agencyId = decoded.agencyId;

        if (!agencyId) {
            return res.status(403).json({ message: 'Not an agency account' });
        }

        const client = await kv.get(`user:${id}`);
        if (!client || client.agencyId !== agencyId) {
            return res.status(404).json({ message: 'Client not found' });
        }

        const pageIds = await kv.smembers(`user:${id}:pages`);
        const pages = [];
        for (const pageId of pageIds) {
            const page = await kv.get(`page:${pageId}`);
            if (page) {
                const serviceSlug = slugify(page.service, { lower: true, strict: true });
                const townSlug = slugify(page.town, { lower: true, strict: true });
                const fileName = `${serviceSlug}-in-${townSlug}.html`;
                pages.push({ ...page, fileName });
            }
        }

        return res.status(200).json({
            id: id,
            name: client.name,
            email: client.email,
            credits: client.credits || 0,
            pages,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = handler;
