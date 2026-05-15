import { kv } from '@vercel/kv';
import { query } from '../db/index.js'; // Import PostgreSQL query utility
const { parse } = require('cookie'); // Use parse from 'cookie' directly
const jwt = require('jsonwebtoken');
const { logError } = require('../../lib/logger');



// Creating an environment
let clientId = process.env.PAYPAL_CLIENT_ID;
let clientSecret = process.env.PAYPAL_CLIENT_SECRET;

// This sample uses SandboxEnvironment. In production, use LiveEnvironment.
let environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
let client = new paypal.core.PayPalHttpClient(environment);

module.exports = async (req, res, currentKvClient) => {
    const currentKv = currentKvClient || kv;
    if (req.method === 'POST') {
        const { orderID, credits } = req.body;
        const request = new paypal.orders.OrdersCaptureRequest(orderID);
        request.requestBody({});

        try {
            // Verify JWT token from cookie
            const cookies = parse(req.headers.cookie || '');
            const token = cookies.authToken; // Correct cookie name

            if (!token) {
                await logError(new Error('Auth token missing.'), 'PayPal Capture - Authentication', 'paypal_error.log');
                return res.status(401).json({ message: 'Authentication required.' });
            }

            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey'); // Add fallback
            } catch (error) {
                await logError(error, 'PayPal Capture - JWT Verification Error', 'paypal_error.log');
                return res.status(401).json({ message: 'Invalid or expired token.' });
            }

            const userId = decoded.userId;

            // Capture PayPal order
            const capture = await client.execute(request);

            if (capture.result.status === 'COMPLETED') {
                // Update user credits in PostgreSQL
                const parsedCredits = parseInt(credits, 10);
                if (isNaN(parsedCredits)) {
                    await logError(new Error(`Invalid credits value received from PayPal: ${credits}`), 'PayPal Capture - Invalid Credits', 'paypal_error.log');
                    return res.status(400).json({ message: 'Invalid credits value received.' });
                }

                const result = await query(
                    'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
                    [parsedCredits, userId]
                );

                if (result.rows.length === 0) {
                    await logError(new Error(`User not found for userId: ${userId}`), 'PayPal Capture - User Not Found in DB', 'paypal_error.log');
                    return res.status(404).json({ message: 'User not found in database.' });
                }

                // Log credit transaction
                const transaction = {
                    date: new Date().toISOString(),
                    description: `Purchased ${parsedCredits} credits via PayPal`,
                    amount: parsedCredits
                };
                await currentKv.lpush(`user:${userId}:credittransactions`, JSON.stringify(transaction));

                console.log(`User ${userId} successfully purchased ${credits} credits via PayPal. New balance: ${result.rows[0].credits}`);


                return res.status(200).json({ success: true, message: 'Payment captured and credits updated.' });
            } else {
                await logError(new Error(`PayPal capture status: ${capture.result.status}`), 'PayPal Capture - Status Not Completed', 'paypal_error.log');
                return res.status(400).json({ success: false, message: 'Payment not completed.' });
            }
        } catch (err) {
            await logError(err, 'PayPal Capture - General Error', 'paypal_error.log');
            return res.status(500).send({ message: 'Error capturing PayPal payment.' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};
