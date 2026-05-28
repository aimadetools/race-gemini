import { kv } from '@vercel/kv';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import slugify from 'slugify';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

async function handler(req, res, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.authToken || cookies.token || cookies.auth;

    if (!token) {
        await logError(new Error('Authentication token missing.'), 'Client Details - Authentication Error', 'client_details_error.log');
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const { id } = req.query;

    if (!id) {
        await logError(new Error('Client ID is required.'), 'Client Details - Missing Client ID', 'client_details_error.log');
        return res.status(400).json({ message: 'Client ID is required' });
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                await logError(error, 'Client Details - Token Expired', 'client_details_error.log');
                return res.status(401).json({ message: 'Authentication failed: Token expired.' });
            } else if (error.name === 'JsonWebTokenError') {
                await logError(error, 'Client Details - Invalid Token', 'client_details_error.log');
                return res.status(401).json({ message: 'Authentication failed: Invalid token.' });
            }
            await logError(error, 'Client Details - JWT Verification Error', 'client_details_error.log');
            return res.status(401).json({ message: 'Authentication failed: Please log in again.' });
        }
        
        const agencyId = decoded.userId || decoded.agencyId;

        if (!agencyId) {
            await logError(new Error('User is not an agency account.'), 'Client Details - Not Agency Account', 'client_details_error.log');
            return res.status(403).json({ message: 'Not an agency account' });
        }

        // Verify agency in PostgreSQL
        const agencyResult = await query('SELECT id, is_agency FROM users WHERE id = $1', [agencyId]);
        if (agencyResult.rows.length === 0 || !agencyResult.rows[0].is_agency) {
            await logError(new Error(`User ${agencyId} is not a valid agency`), 'Client Details - Not Agency Account', 'client_details_error.log');
            return res.status(403).json({ message: 'Not an agency account' });
        }

        // Fetch client details from PostgreSQL
        const clientResult = await query('SELECT id, name, email, credits, agency_id FROM users WHERE id = $1', [id]);
        if (clientResult.rows.length === 0) {
            await logError(new Error(`Client with ID ${id} not found.`), 'Client Details - Client Not Found', 'client_details_error.log');
            return res.status(404).json({ message: 'Client not found' });
        }

        const client = clientResult.rows[0];
        if (client.agency_id !== agencyId) {
            await logError(new Error(`Client ${id} does not belong to agency ${agencyId}.`), 'Client Details - Unauthorized Access', 'client_details_error.log');
            return res.status(403).json({ message: 'Client does not belong to this agency.' });
        }

        const pageIds = await currentKv.smembers(`user:${id}:pages`);
        const pages = [];
        for (const pageId of pageIds) {
            let pageData = await currentKv.get(pageId);
            if (!pageData && !pageId.startsWith('page:')) {
                pageData = await currentKv.get(`page:${pageId}`);
            }
            if (pageData) {
                const page = typeof pageData === 'string' ? JSON.parse(pageData) : pageData;
                const serviceSlug = slugify(page.service, { lower: true, strict: true });
                const townSlug = slugify(page.town, { lower: true, strict: true });
                const fileName = `${serviceSlug}-in-${townSlug}.html`;
                pages.push({ ...page, fileName });
            }
        }

        return res.status(200).json({
            id: id,
            name: client.name,
            email: client.email,
            credits: client.credits || 0,
            pages,
        });

    } catch (error) {
        await logError(error, 'Client Details - General Error', 'client_details_error.log');
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default handler;
