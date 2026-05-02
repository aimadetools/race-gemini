import { kv } from '@vercel/kv';
const bcrypt = require('bcryptjs');

// This is a temporary admin script to create an agency from an inquiry
// In the future, this should be replaced with a proper admin panel
module.exports = async (req, res, currentKvClient) => {
    const currentKv = currentKvClient || kv;
    if (req.method === 'POST') {
        const { inquiryId } = req.body;

        if (!inquiryId) {
            return res.status(400).json({ message: 'Inquiry ID is required' });
        }

        try {
            const inquiryData = await currentKv.get(`agency-inquiry:${inquiryId}`);

            if (!inquiryData) {
                return res.status(404).json({ message: 'Inquiry not found' });
            }

            const { agencyName, contactEmail } = inquiryData;

            const existingAgency = await currentKv.get(`agency:${contactEmail}`);
            if (existingAgency) {
                return res.status(409).json({ message: 'Agency with this email already exists' });
            }

            const password = Math.random().toString(36).slice(-8);
            const passwordHash = await bcrypt.hash(password, 10);
            
            const agencyId = await currentKv.incr('next_agency_id');

            const newAgency = {
                id: agencyId,
                agencyName,
                email: contactEmail,
                passwordHash,
                createdAt: new Date().toISOString(),
            };

            await currentKv.set(`agency:${agencyId}`, newAgency);
            await currentKv.set(`agency:${contactEmail}`, agencyId);

            // In a real application, you would email the agency their password
            // For now, we will just return it in the response
            res.status(201).json({ message: 'Agency created successfully', password: password });

        } catch (error) {
            console.error('Failed to create agency:', error);
            res.status(500).json({ message: 'Failed to create agency due to a server error.' });
        }

    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
