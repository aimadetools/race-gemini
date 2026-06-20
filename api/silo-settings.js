import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async function handler(req, res) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.authToken || cookies.token || cookies.auth;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    let userId;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId || decoded.agencyId;
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

    if (!userId) {
        return res.status(400).json({ message: 'Invalid token payload' });
    }

    if (req.method === 'GET') {
        try {
            // Fetch silo type and limit from users table
            const userResult = await query(
                'SELECT silo_type, silo_limit FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({ message: 'User profile not found' });
            }

            const siloType = userResult.rows[0].silo_type || 'proximity';
            const siloLimit = userResult.rows[0].silo_limit || 5;

            // Fetch pages to construct a link mapping/visual tree on the frontend
            const pagesResult = await query(
                'SELECT id, service, town, latitude, longitude FROM seo_pages WHERE user_id = $1 ORDER BY town ASC',
                [userId]
            );

            return res.status(200).json({
                siloType,
                siloLimit,
                pages: pagesResult.rows || []
            });
        } catch (error) {
            await logError(error, 'Get Silo Settings - General Error');
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { siloType, siloLimit } = req.body;

            // Simple validation
            const validTypes = ['proximity', 'loop', 'hub_and_spoke', 'none'];
            if (!validTypes.includes(siloType)) {
                return res.status(400).json({ message: 'Invalid silo type' });
            }

            const limitVal = parseInt(siloLimit, 10);
            if (isNaN(limitVal) || limitVal < 1 || limitVal > 20) {
                return res.status(400).json({ message: 'Silo link limit must be an integer between 1 and 20' });
            }

            // Update database
            await query(
                'UPDATE users SET silo_type = $1, silo_limit = $2 WHERE id = $3',
                [siloType, limitVal, userId]
            );

            return res.status(200).json({
                message: 'Internal SEO link silo configurations saved successfully!',
                siloType,
                siloLimit: limitVal
            });
        } catch (error) {
            await logError(error, 'Update Silo Settings - General Error');
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
