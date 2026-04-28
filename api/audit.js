const fs = require('fs');
const path = require('path');
import { kv } from '@vercel/kv';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

module.exports = (req, res) => {
    if (req.method === 'POST') {
        const { businessName, businessAddress, businessPhone, services, towns, name, email } = req.body;

        if (!businessName || !businessAddress || !services || !towns || !name || !email) {
            return res.status(400).json({ message: 'All fields are required for the audit. Please fill them out.' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address.' });
        }

        // Basic phone number validation (not empty and reasonable length)
        if (businessPhone && businessPhone.length < 7) { // Assuming a minimum of 7 digits for a phone number
            return res.status(400).json({ message: 'Please enter a valid business phone number.' });
        }

        const servicesArray = services.split(',').map(s => s.trim()).filter(s => s !== '');
        const townsArray = towns.split(',').map(t => t.trim()).filter(t => t !== '');

        const potentialPages = servicesArray.length * townsArray.length;

        // Generate a unique ID for the audit
        const auditId = nanoid();

        const auditData = {
            id: auditId,
            timestamp: new Date().toISOString(),
            businessName,
            businessAddress,
            businessPhone,
            services: servicesArray,
            towns: townsArray,
            name,
            email,
            auditSummary: {
                numberOfServices: servicesArray.length,
                numberOfTowns: townsArray.length,
                potentialPages: potentialPages,
            }
        };

        // Store the audit data in Vercel KV
        try {
            await kv.set(`audit:${auditId}`, JSON.stringify(auditData));
            console.log(`Audit data stored in Vercel KV with ID: ${auditId}`);
        } catch (error) {
            console.error('Failed to store audit data in Vercel KV:', error);
            // Decide how to handle this error. For now, we'll proceed but it's noted.
        }
        
        res.status(200).json({ 
            message: 'Audit submitted successfully. Your audit ID is ' + auditId,
            auditSummary: auditData.auditSummary,
            auditId: auditId
        });

    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
