import { kv } from '@vercel/kv';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';

async function handler(req, res, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.authToken || cookies.token || cookies.auth;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const agencyId = decoded.userId || decoded.agencyId;

        if (!agencyId) {
            return res.status(403).json({ message: 'Not an agency account' });
        }

        const agency = await currentKv.get(`agency:${agencyId}`);
        if (!agency) {
            return res.status(404).json({ message: 'Agency not found.' });
        }

        return res.status(200).json({
            status: agency.subscriptionStatus || 'inactive',
            plan: agency.planName || null,
            creditsPerMonth: agency.monthlyCredits || 0,
            renewsOn: agency.renewalDate || null,
            nextInvoiceAmount: agency.nextInvoiceAmount || null
        });

    } catch (error) {
        console.error(error);
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default handler;
