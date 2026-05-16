import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { logError } from '../../lib/logger.js'; // Import centralized logger

async function handler(req, res, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const { clientName, clientEmail } = req.body;

    if (!clientName || !clientEmail) {
        await logError(new Error('Client name and email are required'), 'Add Client - Validation Error', 'add_client_error.log');
        return res.status(400).json({ message: 'Client name and email are required' });
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;

    if (!token) {
        await logError(new Error('Authentication token missing'), 'Add Client - Authentication Error', 'add_client_error.log');
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                await logError(error, 'Add Client - Token Expired', 'add_client_error.log');
                return res.status(401).json({ message: 'Authentication failed: Token expired.' });
            } else if (error.name === 'JsonWebTokenError') {
                await logError(error, 'Add Client - Invalid Token', 'add_client_error.log');
                return res.status(401).json({ message: 'Authentication failed: Invalid token.' });
            }
            await logError(error, 'Add Client - JWT Verification Error', 'add_client_error.log');
            return res.status(401).json({ message: 'Authentication failed: Please log in again.' });
        }
        
        const agencyId = decoded.agencyId;

        if (!agencyId) {
            await logError(new Error('User is not an agency account'), 'Add Client - Not Agency Account', 'add_client_error.log');
            return res.status(403).json({ message: 'Not an agency account' });
        }

        const existingUser = await currentKv.get(`user:${clientEmail}`);
        if (existingUser) {
            await logError(new Error(`Client with email ${clientEmail} already exists`), 'Add Client - Existing Client', 'add_client_error.log');
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        const password = Math.random().toString(36).slice(-8);
        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = {
            name: clientName,
            email: clientEmail,
            passwordHash,
            agencyId,
            createdAt: new Date().toISOString(),
            credits: 0
        };
        
        const userId = await currentKv.incr('next_user_id');
        await currentKv.set(`user:${userId}`, newUser);
        await currentKv.set(`user:${clientEmail}`, userId);

        await currentKv.sadd(`agency:${agencyId}:clients`, userId);

        // In a real application, you would email the user their password
        // CRITICAL SECURITY FIX: Do not return plain text password. Mock email sending.
        await logError(new Error(`New client ${clientEmail} created by agency ${agencyId}. Password was generated, should be emailed.`), 'Add Client - Password Generated (Mock Email)', 'add_client_error.log');
        return res.status(201).json({ message: 'Client created successfully. Password sent via email (mocked).' });

    } catch (error) {
        await logError(error, 'Add Client - General Error', 'add_client_error.log');
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default handler;
