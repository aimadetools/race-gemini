import { kv } from '@vercel/kv';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

async function handler(req, res, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const { logoUrl, primaryColor } = req.body;

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

        // Update branding in PostgreSQL if agency exists
        const pgResult = await query(
            'UPDATE users SET logo_url = $1, primary_color = $2 WHERE id = $3 AND is_agency = true RETURNING id',
            [logoUrl, primaryColor, agencyId]
        );

        if (pgResult.rows.length === 0) {
            return res.status(404).json({ message: 'Agency not found' });
        }

        // Synchronize with Vercel KV for legacy code compatibility
        const agency = await currentKv.get(`agency:${agencyId}`);
        if (agency) {
            agency.logoUrl = logoUrl;
            agency.primaryColor = primaryColor;
            await currentKv.set(`agency:${agencyId}`, agency);
        }

        return res.status(200).json({ message: 'Branding updated successfully' });

    } catch (error) {
        await logError(error, 'Update Agency Branding - General Error');
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default handler;
