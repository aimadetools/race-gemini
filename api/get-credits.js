const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { query } = require('../db/index.js'); // Import PostgreSQL query utility
const { logError } = require('../../lib/logger'); // Import centralized logger

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.auth;
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
            await logError(error, 'Get Credits API - Token Verification Failed', 'get_credits_error.log');
            return res.status(401).json({ message: 'Authorization failed: Please log in again.' });
        }

        try {
            const userResult = await query('SELECT credits FROM users WHERE id = $1', [userId]);

            if (userResult.rows.length === 0) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const { credits } = userResult.rows[0];
            return res.status(200).json({ credits });

        } catch (error) {
            await logError(error, 'Get Credits API - Database Query Failed', 'get_credits_error.log');
            return res.status(500).json({ message: 'Error retrieving user credits.' });
        }
    } else {
        res.setHeader('Allow', 'GET');
        res.status(405).end('Method Not Allowed');
    }
};
