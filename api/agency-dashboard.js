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

        const agency = await kv.get(`agency:${agencyId}`);
        if (!agency) {
            return res.status(404).json({ message: 'Agency not found' });
        }

        const clientIds = await kv.smembers(`agency:${agencyId}:clients`);
        const clients = [];
        for (const clientId of clientIds) {
            const client = await kv.get(`user:${clientId}`);
            if(client) {
                const pages = await kv.smembers(`user:${clientId}:pages`);
                clients.push({ id: clientId, name: client.name, email: client.email, pagesGenerated: pages.length, credits: client.credits || 0 });
            }
        }

        const totalClients = clients.length;
        const totalPagesGenerated = clients.reduce((total, client) => total + client.pagesGenerated, 0);

        return res.status(200).json({
            agencyName: agency.agencyName,
            email: agency.email,
            clients,
            logoUrl: agency.logoUrl,
            primaryColor: agency.primaryColor,
            credits: agency.credits || 0,
            subscriptionStatus: agency.subscriptionStatus || 'inactive',
            planName: agency.planName || 'N/A',
            monthlyCredits: agency.monthlyCredits !== undefined ? agency.monthlyCredits : 'N/A',
            renewalDate: agency.renewalDate || null,
            totalClients,
            totalPagesGenerated,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = handler;
