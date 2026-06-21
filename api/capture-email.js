import { pool } from '../db/index.js';
import { logError } from '../lib/logger.js'; // Note the .js extension for relative imports

export default async (req, res) => {
    if (res.setHeader) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed.' });
    }

    const { email, url, userId, agencyId, name, phone, message, source } = req.body;

    if (!email || !url) {
        await logError(new Error('Email and URL are required.'), 'Capture Email - Validation Error', 'capture_email_error.log');
        return res.status(400).json({ message: 'Email and URL are required.' });
    }

    try {
        const client = await pool.connect();
        const resolvedUserId = userId || agencyId || null;
        const resolvedName = name || null;
        const resolvedSource = source || 'free-audit';
        const resolvedPhone = phone || null;
        const resolvedMessage = message || null;

        const columns = ['email', 'url', 'source'];
        const values = [email, url, resolvedSource];

        if (resolvedUserId) {
            columns.push('user_id');
            values.push(resolvedUserId);
        }
        if (resolvedName) {
            columns.push('name');
            values.push(resolvedName);
        }
        if (resolvedPhone) {
            columns.push('phone');
            values.push(resolvedPhone);
        }
        if (resolvedMessage) {
            columns.push('message');
            values.push(resolvedMessage);
        }

        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const queryText = `INSERT INTO leads (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;

        const result = await client.query(queryText, values);
        client.release();
        res.status(201).json({ message: 'Email captured successfully.', data: result.rows[0] });
    } catch (error) {
        await logError(error, 'Capture Email - Database Error', 'capture_email_error.log');
        res.status(500).json({ message: 'An error occurred while capturing the email.' });
    }
};
