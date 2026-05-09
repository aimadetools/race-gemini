const jwt = require('jsonwebtoken');
const { parse } = require('cookie');
const { query } = require('../db/index.js'); // Import PostgreSQL query utility
const { logError } = require('../../lib/logger');




module.exports = async (req, res) => {
    if (req.method === 'GET') {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.auth;
        let userId = null;

        if (!token) {
            await logError(new Error('Authentication token missing.'), 'Get Credits - No Token', 'get_credits_error.log');
            return res.status(401).json({ message: 'Authentication required.' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId;
        } catch (error) {
            await logError(error, 'Get Credits - Token Verification', 'get_credits_error.log');
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }

        try {
            const userResult = await query('SELECT credits FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                await logError(new Error(`User not found for userId: ${userId}`), 'Get Credits - User Not Found', 'get_credits_error.log');
                return res.status(404).json({ message: 'User not found.' });
            }
            const userCredits = userResult.rows[0].credits;
            res.status(200).json({ credits: userCredits });
        } catch (error) {
            await logError(error, 'Get Credits - Database Query', 'get_credits_error.log');
            res.status(500).json({ message: 'Error fetching user credits.' });
        }
    } else {
        res.setHeader('Allow', 'GET');
        res.status(405).end('Method Not Allowed');
    }
};