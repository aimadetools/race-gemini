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

    let { customDomain, customDomainRedirect } = req.body;

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
        if (customDomain) {
            customDomain = customDomain.trim().toLowerCase();
            // Validate domain format (alphanumeric, dots, hyphens)
            const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
            if (!domainRegex.test(customDomain)) {
                return res.status(400).json({ message: 'Invalid domain format. e.g., seo.yourdomain.com' });
            }
            // Disallow mapping our own domain
            const blockedDomains = ['localseogen.com', 'www.localseogen.com', 'localhost', '127.0.0.1'];
            if (blockedDomains.includes(customDomain)) {
                return res.status(400).json({ message: 'Cannot use primary platform domains.' });
            }
        } else {
            customDomain = null;
        }

        if (customDomainRedirect) {
            customDomainRedirect = customDomainRedirect.trim();
            // Validate it starts with http:// or https:// or is a valid domain
            if (!customDomainRedirect.startsWith('http://') && !customDomainRedirect.startsWith('https://')) {
                customDomainRedirect = 'https://' + customDomainRedirect;
            }
            try {
                new URL(customDomainRedirect);
            } catch (_) {
                return res.status(400).json({ message: 'Invalid redirect URL format.' });
            }
        } else {
            customDomainRedirect = null;
        }

        // Check if custom domain is already taken by another user
        if (customDomain) {
            const checkResult = await query(
                'SELECT id FROM users WHERE LOWER(custom_domain) = $1 AND id != $2',
                [customDomain, userId]
            );
            if (checkResult.rows.length > 0) {
                return res.status(400).json({ message: 'This custom domain is already mapped to another account.' });
            }
        }

        // Update in PostgreSQL
        const pgResult = await query(
            'UPDATE users SET custom_domain = $1, custom_domain_redirect = $2 WHERE id = $3 RETURNING id',
            [customDomain, customDomainRedirect, userId]
        );

        if (pgResult.rows.length === 0) {
            return res.status(404).json({ message: 'User account not found' });
        }

        return res.status(200).json({ 
            message: 'Custom domain settings updated successfully',
            customDomain,
            customDomainRedirect
        });

    } catch (error) {
        await logError(error, 'Update Custom Domain - General Error');
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default handler;
