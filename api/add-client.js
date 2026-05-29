import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js'; // Import centralized logger
import { sendEmail } from '../lib/email.js';


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
    const token = cookies.authToken || cookies.token || cookies.auth;

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
        
        const agencyId = decoded.userId || decoded.agencyId;

        if (!agencyId) {
            await logError(new Error('User is not an agency account'), 'Add Client - Not Agency Account', 'add_client_error.log');
            return res.status(403).json({ message: 'Not an agency account' });
        }

        // Verify agency exists and is an agency in PostgreSQL
        const agencyResult = await query('SELECT id, is_agency FROM users WHERE id = $1', [agencyId]);
        if (agencyResult.rows.length === 0 || !agencyResult.rows[0].is_agency) {
            await logError(new Error(`User ${agencyId} is not a valid agency`), 'Add Client - Not Agency Account', 'add_client_error.log');
            return res.status(403).json({ message: 'Not an agency account' });
        }

        // Check if user already exists in PostgreSQL
        const existingUserPg = await query('SELECT id FROM users WHERE email = $1', [clientEmail]);
        if (existingUserPg.rows.length > 0) {
            await logError(new Error(`Client with email ${clientEmail} already exists`), 'Add Client - Existing Client', 'add_client_error.log');
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        const password = Math.random().toString(36).slice(-8);
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert client into PostgreSQL users table
        const pgResult = await query(
            'INSERT INTO users (email, password_hash, credits, agency_id, name) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [clientEmail, passwordHash, 0, agencyId, clientName]
        );
        const userId = pgResult.rows[0].id;

        // Synchronize with Vercel KV for legacy code compatibility
        const newUser = {
            name: clientName,
            email: clientEmail,
            passwordHash,
            agencyId,
            createdAt: new Date().toISOString(),
            credits: 0
        };
        
        await currentKv.set(`user:${userId}`, newUser);
        await currentKv.set(`user:${clientEmail}`, userId);
        await currentKv.sadd(`agency:${agencyId}:clients`, userId);

        // Send email to new client with their login credentials
        const emailSubject = `Welcome to LocalLeads`;
        const emailHtml = `
            <h2>Welcome to LocalLeads!</h2>
            <p>An account has been created for you by your agency.</p>
            <p>You can now log in at <a href="https://www.localseogen.com/auth.html">https://www.localseogen.com/auth.html</a> using the following credentials:</p>
            <p><strong>Email:</strong> ${clientEmail}</p>
            <p><strong>Password:</strong> ${password}</p>
            <br/>
            <p>Please change your password after logging in by visiting the dashboard or using the forgot password option.</p>
            <p>Best regards,<br/>The LocalLeads Team</p>
        `;
        
        try {
            await sendEmail(clientEmail, emailSubject, emailHtml);
            await logError(null, `Welcome email sent to client: ${clientEmail}`, 'add_client_error.log');
        } catch (emailError) {
            await logError(emailError, `Failed to send welcome email to client: ${clientEmail}`, 'add_client_error.log');
        }

        return res.status(201).json({ message: 'Client created successfully. Password sent via email.' });

    } catch (error) {
        await logError(error, 'Add Client - General Error', 'add_client_error.log');
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default handler;
