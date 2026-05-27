import { kv } from '@vercel/kv';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async function handler(request, response, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).end(`Method ${request.method} Not Allowed`);
    }

    const { clientId, name, email } = request.body;

    if (!clientId || !name || !email) {
        return response.status(400).json({ message: 'Client ID, name, and email are required.' });
    }

    const cookies = cookie.parse(request.headers.cookie || '');
    const token = cookies.authToken || cookies.token || cookies.auth;

    if (!token) {
        return response.status(401).json({ message: 'Not authenticated.' });
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return response.status(401).json({ message: 'Invalid or expired token.' });
        }

        const agencyId = decoded.userId || decoded.agencyId;

        if (!agencyId) {
            return response.status(403).json({ message: 'Not an agency account' });
        }

        // Verify agency in PostgreSQL
        const agencyResult = await query('SELECT id, is_agency FROM users WHERE id = $1', [agencyId]);
        if (agencyResult.rows.length === 0 || !agencyResult.rows[0].is_agency) {
            return response.status(403).json({ message: 'Not an agency account' });
        }

        // Update client details in PostgreSQL if the client belongs to this agency
        const pgUpdateResult = await query(
            'UPDATE users SET name = $1, email = $2 WHERE id = $3 AND agency_id = $4 RETURNING id',
            [name, email, clientId, agencyId]
        );

        if (pgUpdateResult.rows.length === 0) {
            return response.status(404).json({ message: 'Client not found or does not belong to this agency.' });
        }

        // Synchronize with Vercel KV for legacy code compatibility
        const client = await currentKv.get(`user:${clientId}`);
        if (client) {
            client.name = name;
            client.email = email;
            await currentKv.set(`user:${clientId}`, client);
        }

        return response.status(200).json({ message: 'Client updated successfully.' });

    } catch (error) {
        await logError(error, 'Update Client - General Error', 'update_client_error.log');
        return response.status(500).json({ message: 'Internal server error.' });
    }
}
