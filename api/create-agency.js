import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';
import { sendEmail } from '../lib/email.js';

// This is a temporary admin script to create an agency from an inquiry
// In the future, this should be replaced with a proper admin panel
export default async (req, res, currentKvClient) => {
    const secret = req.query.secret || req.headers['x-admin-secret'];
    if (!process.env.MIGRATION_SECRET) {
        return res.status(401).json({ message: 'Unauthorized: MIGRATION_SECRET not configured.' });
    }
    if (secret !== process.env.MIGRATION_SECRET) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }

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

            // Check if agency exists in KV or PostgreSQL
            const existingAgencyKv = await currentKv.get(`agency:${contactEmail}`);
            const existingAgencyPg = await query('SELECT id FROM users WHERE email = $1', [contactEmail]);
            if (existingAgencyKv || existingAgencyPg.rows.length > 0) {
                await logError(new Error(`Agency with email ${contactEmail} already exists.`), 'Create Agency - Existing Agency', 'create_agency_error.log');
                return res.status(409).json({ message: 'Agency with this email already exists' });
            }

            const password = Math.random().toString(36).slice(-8);
            const passwordHash = await bcrypt.hash(password, 10);
            
            // Insert agency into PostgreSQL users table
            const pgResult = await query(
                'INSERT INTO users (email, password_hash, credits, is_agency, name) VALUES ($1, $2, 0, true, $3) RETURNING id',
                [contactEmail, passwordHash, agencyName]
            );
            const agencyId = pgResult.rows[0].id;

            // Sync with Vercel KV for legacy endpoint compatibility
            const newAgency = {
                id: agencyId,
                agencyName,
                email: contactEmail,
                passwordHash, // Legacy camelCase key used in KV
                createdAt: new Date().toISOString(),
            };

            await currentKv.set(`agency:${agencyId}`, newAgency);
            await currentKv.set(`agency:${contactEmail}`, agencyId);

            // Send email to agency with their login credentials
            const emailSubject = `Welcome to LocalLeads Agency Program`;
            const emailHtml = `
                <h2>Welcome to LocalLeads!</h2>
                <p>Your agency account has been created successfully.</p>
                <p>You can now log in at <a href="https://www.localseogen.com/agency-login.html">https://www.localseogen.com/agency-login.html</a> with the following credentials:</p>
                <p><strong>Email:</strong> ${contactEmail}</p>
                <p><strong>Password:</strong> ${password}</p>
                <br/>
                <p>Please change your password after logging in.</p>
                <p>Best regards,<br/>The LocalLeads Team</p>
            `;
            
            try {
                await sendEmail(contactEmail, emailSubject, emailHtml);
                await logError(null, `Welcome email sent to agency: ${contactEmail}`, 'create_agency_error.log');
            } catch (emailError) {
                await logError(emailError, `Failed to send welcome email to agency: ${contactEmail}`, 'create_agency_error.log');
            }

            res.status(201).json({ message: 'Agency created successfully. Password sent via email.' });

        } catch (error) {
            await logError(error, 'Create Agency - General Error', 'create_agency_error.log');
            res.status(500).json({ message: 'Failed to create agency due to a server error.' });
        }

    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
