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

    const { email, url, userId, agencyId, name, source } = req.body;

    if (!email || !url) {
        await logError(new Error('Email and URL are required.'), 'Capture Email - Validation Error', 'capture_email_error.log');
        return res.status(400).json({ message: 'Email and URL are required.' });
    }

    try {
        const client = await pool.connect();
        const resolvedUserId = userId || agencyId || null;
        const resolvedName = name || null;
        const resolvedSource = source || 'free-audit';

        let result;
        if (resolvedUserId || resolvedName) {
            result = await client.query(
                'INSERT INTO leads (email, url, source, user_id, name) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [email, url, resolvedSource, resolvedUserId, resolvedName]
            );
        } else {
            result = await client.query(
                'INSERT INTO leads (email, url, source) VALUES ($1, $2, $3) RETURNING *',
                [email, url, resolvedSource]
            );
        }
        client.release();
        res.status(201).json({ message: 'Email captured successfully.', data: result.rows[0] });
    } catch (error) {
        await logError(error, 'Capture Email - Database Error', 'capture_email_error.log');
        res.status(500).json({ message: 'An error occurred while capturing the email.' });
    }
};
