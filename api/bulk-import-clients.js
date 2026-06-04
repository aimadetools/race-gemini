import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';
import { sendEmail } from '../lib/email.js';

async function handler(req, res, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const { clients } = req.body;

    if (!clients || !Array.isArray(clients)) {
        await logError(new Error('Clients list must be an array'), 'Bulk Import - Validation Error', 'bulk_import_error.log');
        return res.status(400).json({ message: 'Clients list is required and must be an array' });
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.authToken || cookies.token || cookies.auth;

    if (!token) {
        await logError(new Error('Authentication token missing'), 'Bulk Import - Authentication Error', 'bulk_import_error.log');
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                await logError(error, 'Bulk Import - Token Expired', 'bulk_import_error.log');
                return res.status(401).json({ message: 'Authentication failed: Token expired.' });
            } else if (error.name === 'JsonWebTokenError') {
                await logError(error, 'Bulk Import - Invalid Token', 'bulk_import_error.log');
                return res.status(401).json({ message: 'Authentication failed: Invalid token.' });
            }
            await logError(error, 'Bulk Import - JWT Verification Error', 'bulk_import_error.log');
            return res.status(401).json({ message: 'Authentication failed: Please log in again.' });
        }
        
        const agencyId = decoded.userId || decoded.agencyId;

        if (!agencyId) {
            await logError(new Error('User is not an agency account'), 'Bulk Import - Not Agency Account', 'bulk_import_error.log');
            return res.status(403).json({ message: 'Not an agency account' });
        }

        // Verify agency exists and is an agency in PostgreSQL
        const agencyResult = await query('SELECT id, is_agency FROM users WHERE id = $1', [agencyId]);
        if (agencyResult.rows.length === 0 || !agencyResult.rows[0].is_agency) {
            await logError(new Error(`User ${agencyId} is not a valid agency`), 'Bulk Import - Not Agency Account', 'bulk_import_error.log');
            return res.status(403).json({ message: 'Not an agency account' });
        }

        const imported = [];
        const skipped = [];
        const failed = [];

        for (const client of clients) {
            const clientName = client.name ? client.name.trim() : '';
            const clientEmail = client.email ? client.email.trim().toLowerCase() : '';

            if (!clientName || !clientEmail) {
                failed.push({
                    name: clientName || '(unknown)',
                    email: clientEmail || '(unknown)',
                    reason: 'Name and email are required'
                });
                continue;
            }

            try {
                // Check if user already exists in PostgreSQL
                const existingUserPg = await query('SELECT id FROM users WHERE email = $1', [clientEmail]);
                if (existingUserPg.rows.length > 0) {
                    skipped.push({
                        name: clientName,
                        email: clientEmail,
                        reason: 'User with this email already exists'
                    });
                    continue;
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
                } catch (emailError) {
                    await logError(emailError, `Failed to send welcome email to client during bulk import: ${clientEmail}`, 'bulk_import_error.log');
                }

                imported.push({ name: clientName, email: clientEmail });

            } catch (innerError) {
                await logError(innerError, `Failed to import client: ${clientEmail}`, 'bulk_import_error.log');
                failed.push({
                    name: clientName,
                    email: clientEmail,
                    reason: innerError.message || 'Database or system error'
                });
            }
        }

        const statusCode = imported.length > 0 ? 201 : 200;
        return res.status(statusCode).json({
            message: 'Bulk import process completed.',
            importedCount: imported.length,
            skippedCount: skipped.length,
            failedCount: failed.length,
            imported,
            skipped,
            failed
        });

    } catch (error) {
        await logError(error, 'Bulk Import - General Error', 'bulk_import_error.log');
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default handler;
