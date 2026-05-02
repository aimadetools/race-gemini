import { kv } from '@vercel/kv';
const bcrypt = require('bcryptjs');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');

async function handler(req, res, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const { clientName, clientEmail } = req.body;

    if (!clientName || !clientEmail) {
        return res.status(400).json({ message: 'Client name and email are required' });
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const agencyId = decoded.agencyId;

        if (!agencyId) {
            return res.status(403).json({ message: 'Not an agency account' });
        }

        const existingUser = await currentKv.get(`user:${clientEmail}`);
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        const password = Math.random().toString(36).slice(-8);
        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = {
            name: clientName,
            email: clientEmail,
            passwordHash,
            agencyId,
            createdAt: new Date().toISOString(),
            credits: 0
        };
        
        const userId = await currentKv.incr('next_user_id');
        await currentKv.set(`user:${userId}`, newUser);
        await currentKv.set(`user:${clientEmail}`, userId);

        await currentKv.sadd(`agency:${agencyId}:clients`, userId);

        // In a real application, you would email the user their password
        // For this example, we will just return it in the response
        return res.status(201).json({ message: 'Client created successfully', password: password });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = handler;
