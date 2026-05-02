import { kv } from '@vercel/kv';
const cookie = require('cookie');
const jwt = require('jsonwebtoken');

async function handler(req, res, currentKvClient) {
    const currentKv = currentKvClient || kv;
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

        const billingHistory = await currentKv.zrange(`agency:${agencyId}:billing`, 0, -1, { withScores: true, rev: true });
        
        const transactions = [];
        for (let i = 0; i < billingHistory.length; i += 2) {
            const member = billingHistory[i];
            const score = billingHistory[i + 1];
            const transaction = JSON.parse(member);
            transaction.date = new Date(score).toISOString();
            transactions.push(transaction);
        }

        return res.status(200).json(transactions);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = handler;
