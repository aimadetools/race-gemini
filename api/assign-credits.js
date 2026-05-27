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

    const { clientId, credits } = req.body;
    const creditsToAssign = parseInt(credits, 10);

    if (!clientId || !creditsToAssign || creditsToAssign <= 0) {
        await logError(new Error(`Missing client ID or invalid credits: clientId=${clientId}, credits=${creditsToAssign}`), 'Assign Credits - Validation Error', 'assign_credits_error.log');
        return res.status(400).json({ message: 'Client ID and a positive number of credits are required.' });
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.authToken || cookies.token || cookies.auth;

    if (!token) {
        await logError(new Error('Authentication token missing.'), 'Assign Credits - Authentication Error', 'assign_credits_error.log');
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                await logError(error, 'Assign Credits - Token Expired', 'assign_credits_error.log');
                return res.status(401).json({ message: 'Authentication failed: Token expired.' });
            } else if (error.name === 'JsonWebTokenError') {
                await logError(error, 'Assign Credits - Invalid Token', 'assign_credits_error.log');
                return res.status(401).json({ message: 'Authentication failed: Invalid token.' });
            }
            await logError(error, 'Assign Credits - JWT Verification Error', 'assign_credits_error.log');
            return res.status(401).json({ message: 'Authentication failed: Please log in again.' });
        }
        
        const agencyId = decoded.userId || decoded.agencyId;

        if (!agencyId) {
            await logError(new Error('User is not an agency account.'), 'Assign Credits - Not Agency Account', 'assign_credits_error.log');
            return res.status(403).json({ message: 'Not an agency account' });
        }

        // Verify agency credits in PostgreSQL
        const agencyResult = await query('SELECT id, credits, is_agency FROM users WHERE id = $1', [agencyId]);
        if (agencyResult.rows.length === 0 || !agencyResult.rows[0].is_agency) {
            await logError(new Error(`Agency not found for agencyId: ${agencyId}`), 'Assign Credits - Agency Not Found', 'assign_credits_error.log');
            return res.status(404).json({ message: 'Agency not found' });
        }
        const agencyCredits = agencyResult.rows[0].credits || 0;

        if (agencyCredits < creditsToAssign) {
            await logError(new Error(`Agency ${agencyId} has insufficient credits to assign ${creditsToAssign}. Available: ${agencyCredits}`), 'Assign Credits - Insufficient Agency Credits', 'assign_credits_error.log');
            return res.status(400).json({ message: 'Insufficient credits.' });
        }

        // Verify client belongs to this agency in PostgreSQL
        const clientResult = await query('SELECT id, name, email, credits FROM users WHERE id = $1 AND agency_id = $2', [clientId, agencyId]);
        if (clientResult.rows.length === 0) {
            await logError(new Error(`Client not found or does not belong to agency ${agencyId} for clientId: ${clientId}`), 'Assign Credits - Client Not Found', 'assign_credits_error.log');
            return res.status(404).json({ message: 'Client not found or does not belong to this agency.' });
        }
        const client = clientResult.rows[0];

        // Deduct from agency and add to client in PostgreSQL
        await query('UPDATE users SET credits = credits - $1 WHERE id = $2', [creditsToAssign, agencyId]);
        await query('UPDATE users SET credits = credits + $1 WHERE id = $2', [creditsToAssign, clientId]);

        // Synchronize legacy Vercel KV structures
        const legacyAgency = await currentKv.get(`agency:${agencyId}`);
        if (legacyAgency) {
            legacyAgency.credits = (legacyAgency.credits || 0) - creditsToAssign;
            await currentKv.set(`agency:${agencyId}`, legacyAgency);
        }

        const legacyClient = await currentKv.get(`user:${clientId}`);
        if (legacyClient) {
            legacyClient.credits = (legacyClient.credits || 0) + creditsToAssign;
            await currentKv.set(`user:${clientId}`, legacyClient);
            // CRITICAL BUG FIX: Ensure user:email correctly maps to the integer ID as a string, not the full client object!
            await currentKv.set(`user:${client.email}`, clientId.toString());
        }

        const historyEntry = {
            clientId,
            clientName: client.name,
            credits: creditsToAssign,
            date: new Date().toISOString(),
        };

        await currentKv.lpush(`agency:${agencyId}:creditHistory`, JSON.stringify(historyEntry));

        return res.status(200).json({ message: 'Credits assigned successfully' });

    } catch (error) {
        await logError(error, 'Assign Credits - General Error', 'assign_credits_error.log');
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default handler;
