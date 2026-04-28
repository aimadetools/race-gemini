const { kv } = require('@vercel/kv');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

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

        const creditHistory = await kv.lrange(`agency:${agencyId}:creditHistory`, 0, -1);

        return res.status(200).json(creditHistory);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = handler;
