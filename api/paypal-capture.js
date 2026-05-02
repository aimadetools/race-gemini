const paypal = require('@paypal/checkout-server-sdk');
import { kv } from '@vercel/kv';
const { parse } = require('cookie'); // Use parse from 'cookie' directly
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

async function logError(error, context) {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    const logFilePath = path.join(logDir, 'paypal_error.log'); // Log to paypal_error.log
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] Context: ${context}\nError: ${error.message}\nStack: ${error.stack}\n\n`;
    fs.appendFileSync(logFilePath, errorMessage);
}

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
                await logError(new Error('Auth token missing.'), 'PayPal Capture - Authentication');
                return res.status(401).json({ message: 'Authentication required.' });
            }

            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey'); // Add fallback
            } catch (error) {
                await logError(error, 'PayPal Capture - JWT Verification Error');
                return res.status(401).json({ message: 'Invalid or expired token.' });
            }

            const userId = decoded.userId;

            // Capture PayPal order
            const capture = await client.execute(request);

            if (capture.result.status === 'COMPLETED') {
                // Retrieve user email from userId
                const userEmail = await currentKv.get(`userId:${userId}`);
                if (!userEmail) {
                    await logError(new Error(`User email not found for userId: ${userId}`), 'PayPal Capture - User Retrieval');
                    return res.status(404).json({ message: 'User not found.' });
                }

                // Retrieve full user object
                const userString = await currentKv.get(`user:${userEmail}`);
                if (!userString) {
                    await logError(new Error(`User profile not found for email: ${userEmail}`), 'PayPal Capture - User Profile Retrieval');
                    return res.status(404).json({ message: 'User profile not found.' });
                }
                let user = JSON.parse(userString);

                // Update user credits
                user.credits = (user.credits || 0) + parseInt(credits, 10);
                await currentKv.set(`user:${userEmail}`, JSON.stringify(user));

                return res.status(200).json({ success: true, message: 'Payment captured and credits updated.' });
            } else {
                await logError(new Error(`PayPal capture status: ${capture.result.status}`), 'PayPal Capture - Status Not Completed');
                return res.status(400).json({ success: false, message: 'Payment not completed.' });
            }
        } catch (err) {
            await logError(err, 'PayPal Capture - General Error');
            return res.status(500).send({ message: 'Error capturing PayPal payment.' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};
