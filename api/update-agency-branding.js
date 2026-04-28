const { kv } = require('@vercel/kv');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const { logoUrl, primaryColor } = req.body;

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const agencyId = decoded.agencyId;

        if (!agencyId) {
            return res.status(403).json({ message: 'Not an agency account' });
        }

        const agency = await kv.get(`agency:${agencyId}`);
        if (!agency) {
            return res.status(404).json({ message: 'Agency not found' });
        }

        agency.logoUrl = logoUrl;
        agency.primaryColor = primaryColor;

        await kv.set(`agency:${agencyId}`, agency);

        return res.status(200).json({ message: 'Branding updated successfully' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = handler;
