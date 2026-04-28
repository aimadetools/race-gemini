const { kv } = require('@vercel/kv');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const { clientId, credits } = req.body;
    const creditsToAssign = parseInt(credits, 10);

    if (!clientId || !creditsToAssign || creditsToAssign <= 0) {
        return res.status(400).json({ message: 'Client ID and a positive number of credits are required.' });
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

        const agency = await kv.get(`agency:${agencyId}`);
        if (!agency) {
            return res.status(404).json({ message: 'Agency not found' });
        }

        if ((agency.credits || 0) < creditsToAssign) {
            return res.status(400).json({ message: 'Insufficient credits.' });
        }

        const client = await kv.get(`user:${clientId}`);
        if (!client) {
            return res.status(404).json({ message: 'Client not found.' });
        }
        
        // Ensure client belongs to the agency
        const agencyClientIds = await kv.smembers(`agency:${agencyId}:clients`);
        if (!agencyClientIds.includes(clientId)) {
            return res.status(403).json({ message: 'Client does not belong to this agency.' });
        }

        agency.credits -= creditsToAssign;
        client.credits = (client.credits || 0) + creditsToAssign;

        await kv.set(`agency:${agencyId}`, agency);
        await kv.set(`user:${client.email}`, client);

        const historyEntry = {
            clientId,
            clientName: client.name,
            credits: creditsToAssign,
            date: new Date().toISOString(),
        };

        await kv.lpush(`agency:${agencyId}:creditHistory`, JSON.stringify(historyEntry));

        return res.status(200).json({ message: 'Credits assigned successfully' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = handler;
