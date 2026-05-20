import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import { logError } from '../lib/logger.js';

// This is a temporary admin script to create an agency from an inquiry
// In the future, this should be replaced with a proper admin panel
export default async (req, res, currentKvClient) => {
    const currentKv = currentKvClient || kv;
    if (req.method === 'POST') {
        const { inquiryId } = req.body;

        if (!inquiryId) {
            await logError(new Error('Inquiry ID is required.'), 'Create Agency - Validation Error', 'create_agency_error.log');
            return res.status(400).json({ message: 'Inquiry ID is required' });
        }

        try {
            const inquiryData = await currentKv.get(`agency-inquiry:${inquiryId}`);

            if (!inquiryData) {
                await logError(new Error(`Inquiry not found for ID: ${inquiryId}`), 'Create Agency - Inquiry Not Found', 'create_agency_error.log');
                return res.status(404).json({ message: 'Inquiry not found' });
            }

            const { agencyName, contactEmail } = inquiryData;

            const existingAgency = await currentKv.get(`agency:${contactEmail}`);
            if (existingAgency) {
                await logError(new Error(`Agency with email ${contactEmail} already exists.`), 'Create Agency - Existing Agency', 'create_agency_error.log');
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
            // CRITICAL SECURITY FIX: Do not return plain text password. Mock email sending.
            await logError(new Error(`New agency ${contactEmail} created. Password was generated, should be emailed.`), 'Create Agency - Password Generated (Mock Email)', 'create_agency_error.log');
            res.status(201).json({ message: 'Agency created successfully. Password sent via email (mocked).' });

        } catch (error) {
            await logError(error, 'Create Agency - General Error', 'create_agency_error.log');
            res.status(500).json({ message: 'Failed to create agency due to a server error.' });
        }

    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
