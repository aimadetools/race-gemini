// api/user-referral-data.js
import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import fs from 'fs'; // For error logging
import path from 'path'; // For error logging

async function logError(error, context) {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    const logFilePath = path.join(logDir, 'user_referral_data_error.log');
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] Context: ${context}
Error: ${error.message}
Stack: ${error.stack}

`;
    fs.appendFileSync(logFilePath, errorMessage);
}

export default async function handler(req, res, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.authToken;

        if (!token) {
            return res.status(401).json({ message: 'Not authenticated. Please log in.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            await logError(error, 'JWT Verification Error');
            return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
        }

        const userId = decoded.userId;

        // Fetch user's referral data from Vercel KV
        // For now, we'll simulate fetching data from KV.
        // In a real scenario, you'd store and retrieve specific referral data for this userId.
        const userReferralDataString = await currentKv.get(`user:${userId}:referral_data`);
        let referralData;

        if (userReferralDataString) {
            referralData = JSON.parse(userReferralDataString);
        } else {
            // If no referral data found, provide defaults
            referralData = {
                referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/referral-signup?ref=${userId}`,
                totalReferrals: 0,
                convertedReferrals: 0,
                earnedRewards: 0.00,
                recentReferrals: [
                    { id: 'ref1', userEmail: 'user1@example.com', status: 'Converted', date: '2026-04-15', reward: 25.00 },
                    { id: 'ref2', userEmail: 'user2@example.com', status: 'Pending', date: '2026-04-10', reward: 0.00 },
                    { id: 'ref3', userEmail: 'user3@example.com', status: 'Converted', date: '2026-03-20', reward: 50.00 },
                    { id: 'ref4', userEmail: 'user4@example.com', status: 'Pending', date: '2026-03-01', reward: 0.00 },
                ],
            };
            // Optionally save this initial data to KV
            await currentKv.set(`user:${userId}:referral_data`, JSON.stringify(referralData));
        }

        return res.status(200).json(referralData);
    } catch (error) {
        await logError(error, 'User Referral Data Fetch Error');
        return res.status(500).json({ message: 'Failed to fetch referral data.', error: error.message });
    }
}