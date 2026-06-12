import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { kv } from '@vercel/kv';
import { logError, logInfo } from '../lib/logger.js';

export default async (req, res, currentKvClient) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const currentKv = currentKvClient || kv;
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.authToken || cookies.auth;
    let userId = null;

    if (!token) {
        return res.status(401).json({ message: 'Authorization required: No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Authorization failed: Token expired.' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Authorization failed: Invalid token.' });
        }
        await logError(error, 'Unlock Lead API - Token Verification Failed', 'unlock_lead_error.log');
        return res.status(401).json({ message: 'Authorization failed: Please log in again.' });
    }

    const { leadId } = req.body;
    if (!leadId) {
        return res.status(400).json({ message: 'Missing required field: leadId.' });
    }

    try {
        // Find lead and ensure it belongs to the authenticated user
        const leadResult = await query(
            'SELECT id, name, email, phone, message, url, created_at, is_unlocked FROM leads WHERE id = $1 AND user_id = $2',
            [leadId, userId]
        );

        if (leadResult.rows.length === 0) {
            return res.status(404).json({ message: 'Lead not found or does not belong to you.' });
        }

        const lead = leadResult.rows[0];

        // Retrieve user info (credits, paying status)
        const userResult = await query(
            'SELECT credits, is_agency, subscription_status FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        const user = userResult.rows[0];
        const isPaidUser = user.is_agency || user.subscription_status === 'active';

        // If user is already paid or lead is already unlocked, just return the lead info without debiting credits
        if (isPaidUser || lead.is_unlocked) {
            return res.status(200).json({
                message: 'Lead is already unlocked.',
                lead: {
                    id: lead.id,
                    name: lead.name,
                    email: lead.email,
                    phone: lead.phone,
                    message: lead.message,
                    url: lead.url,
                    created_at: lead.created_at,
                    is_unlocked: true
                }
            });
        }

        // Check if user has at least 1 credit
        if (user.credits < 1) {
            return res.status(400).json({ message: 'Insufficient credits to unlock lead. Please purchase more credits.' });
        }

        // Deduct 1 credit from user and set is_unlocked to true
        await query('UPDATE users SET credits = credits - 1 WHERE id = $1', [userId]);
        await query('UPDATE leads SET is_unlocked = TRUE WHERE id = $1', [leadId]);

        // Log transaction in KV
        const transaction = {
            date: new Date().toISOString(),
            description: `Unlocked lead: ${lead.name}`,
            amount: -1
        };
        await currentKv.lpush(`user:${userId}:credittransactions`, JSON.stringify(transaction));
        await logInfo(`User ${userId} spent 1 credit to unlock lead ${leadId}`, 'Unlock Lead');

        return res.status(200).json({
            message: 'Lead unlocked successfully.',
            lead: {
                id: lead.id,
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                message: lead.message,
                url: lead.url,
                created_at: lead.created_at,
                is_unlocked: true
            }
        });

    } catch (error) {
        await logError(error, 'Unlock Lead API - Database Error', 'unlock_lead_error.log');
        return res.status(500).json({ message: 'Internal Server Error. Could not unlock lead.' });
    }
};
