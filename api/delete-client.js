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

    const { clientId } = request.body;

    if (!clientId) {
        await logError(new Error('Client ID is required.'), 'Delete Client - Validation Error', 'delete_client_error.log');
        return response.status(400).json({ message: 'Client ID is required.' });
    }

    const cookies = cookie.parse(request.headers.cookie || '');
    const token = cookies.authToken || cookies.token || cookies.auth;

    if (!token) {
        await logError(new Error('Authentication token missing.'), 'Delete Client - Authentication Error', 'delete_client_error.log');
        return response.status(401).json({ message: 'Not authenticated.' });
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            await logError(error, 'Delete Client - Invalid Token', 'delete_client_error.log');
            return response.status(401).json({ message: 'Agency session invalid.' });
        }

        const agencyId = decoded.userId || decoded.agencyId;

        if (!agencyId) {
            await logError(new Error('User is not an agency account.'), 'Delete Client - Not Agency Account', 'delete_client_error.log');
            return response.status(403).json({ message: 'Not an agency account' });
        }

        // Verify agency in PostgreSQL
        const agencyResult = await query('SELECT id, is_agency FROM users WHERE id = $1', [agencyId]);
        if (agencyResult.rows.length === 0 || !agencyResult.rows[0].is_agency) {
            return response.status(403).json({ message: 'Not an agency account' });
        }

        // Verify client belongs to this agency in PostgreSQL
        const clientResult = await query('SELECT id, email FROM users WHERE id = $1 AND agency_id = $2', [clientId, agencyId]);
        if (clientResult.rows.length === 0) {
            await logError(new Error(`Client ID ${clientId} not found or does not belong to agency ${agencyId}.`), 'Delete Client - Client Not Found/Unauthorized', 'delete_client_error.log');
            return response.status(404).json({ message: 'Client not found or does not belong to this agency.' });
        }
        const clientEmail = clientResult.rows[0].email;

        // Retrieve generated pages associated with client from KV Set
        const pageIds = await currentKv.smembers(`user:${clientId}:pages`);

        // Delete all pages associated with the client in KV
        if (pageIds && pageIds.length > 0) {
            const pageKeysToDelete = pageIds.map(pId => `page:${pId}`);
            await currentKv.del(...pageKeysToDelete);
        }
        await currentKv.del(`user:${clientId}:pages`);

        // Delete the client row from PostgreSQL users table
        await query('DELETE FROM users WHERE id = $1 AND agency_id = $2', [clientId, agencyId]);

        // Clean up Vercel KV legacy structures
        await currentKv.del(`user:${clientId}`);
        await currentKv.del(`user:${clientEmail}`);
        await currentKv.srem(`agency:${agencyId}:clients`, clientId);

        return response.status(200).json({ message: 'Client and associated data deleted successfully.' });

    } catch (error) {
        await logError(error, 'Delete Client - General Error', 'delete_client_error.log');
        return response.status(500).json({ message: 'Internal server error.' });
    }
}
