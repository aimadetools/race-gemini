import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    let { widgetCss } = req.body;

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.authToken || cookies.token || cookies.auth;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId || decoded.agencyId;

        if (!userId) {
            return res.status(400).json({ message: 'Invalid token payload' });
        }

        // Clean values
        if (widgetCss !== undefined && widgetCss !== null) {
            widgetCss = widgetCss.toString();
            if (widgetCss.length > 10000) {
                return res.status(400).json({ message: 'Custom CSS must be under 10,000 characters' });
            }
            // Strip any <style> / </style> tags if the user wrapped it
            widgetCss = widgetCss.replace(/<\/?style>/gi, '').trim();
        } else {
            widgetCss = null;
        }

        // Update in PostgreSQL
        const pgResult = await query(
            'UPDATE users SET widget_css = $1 WHERE id = $2 RETURNING id',
            [widgetCss, userId]
        );

        if (pgResult.rows.length === 0) {
            return res.status(404).json({ message: 'User account not found' });
        }

        return res.status(200).json({ 
            message: 'Widget CSS updated successfully',
            widgetCss
        });

    } catch (error) {
        await logError(error, 'Update Widget CSS - General Error');
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default handler;
