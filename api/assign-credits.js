import { kv } from '@vercel/kv';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { logError } from '../../lib/logger.js';

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
    const token = cookies.token;

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
        
        const agencyId = decoded.agencyId;

        if (!agencyId) {
            await logError(new Error('User is not an agency account.'), 'Assign Credits - Not Agency Account', 'assign_credits_error.log');
            return res.status(403).json({ message: 'Not an agency account' });
        }

        const agency = await currentKv.get(`agency:${agencyId}`);
        if (!agency) {
            await logError(new Error(`Agency not found for agencyId: ${agencyId}`), 'Assign Credits - Agency Not Found', 'assign_credits_error.log');
            return res.status(404).json({ message: 'Agency not found' });
        }

        if ((agency.credits || 0) < creditsToAssign) {
            await logError(new Error(`Agency ${agencyId} has insufficient credits to assign ${creditsToAssign}. Available: ${agency.credits || 0}`), 'Assign Credits - Insufficient Agency Credits', 'assign_credits_error.log');
            return res.status(400).json({ message: 'Insufficient credits.' });
        }

        const client = await currentKv.get(`user:${clientId}`);
        if (!client) {
            await logError(new Error(`Client not found for clientId: ${clientId}`), 'Assign Credits - Client Not Found', 'assign_credits_error.log');
            return res.status(404).json({ message: 'Client not found.' });
        }
        
        // Ensure client belongs to the agency
        const agencyClientIds = await currentKv.smembers(`agency:${agencyId}:clients`);
        if (!agencyClientIds.includes(clientId)) {
            await logError(new Error(`Client ${clientId} does not belong to agency ${agencyId}.`), 'Assign Credits - Client Not Agency Member', 'assign_credits_error.log');
            return res.status(403).json({ message: 'Client does not belong to this agency.' });
        }

        agency.credits -= creditsToAssign;
        client.credits = (client.credits || 0) + creditsToAssign;

        await currentKv.set(`agency:${agencyId}`, agency);
        await currentKv.set(`user:${client.email}`, client);

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
