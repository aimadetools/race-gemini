import { customAlphabet } from 'nanoid';
import trackEventHandler from './track.js'; // Import the event tracking handler
import { logError } from '../lib/logger.js';
import { kv } from '@vercel/kv';
import { sendEmail } from '../lib/email.js';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

export default async (req, res, currentKvClient) => {
    const currentKv = currentKvClient || kv;
    if (req.method === 'POST') {
        const { agencyName, website, contactPerson, contactEmail, phoneNumber, clientVolume, message } = req.body;

        // Basic validation
        if (!agencyName || !website || !contactPerson || !contactEmail) {
            await logError(new Error('Missing required fields.'), 'Agency Signup - Validation Error', 'agency_signup_error.log');
            return res.status(400).json({ message: 'Agency Name, Website, Contact Person, and Contact Email are required.' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactEmail)) {
            await logError(new Error(`Invalid contact email address: ${contactEmail}`), 'Agency Signup - Invalid Email', 'agency_signup_error.log');
            return res.status(400).json({ message: 'Please enter a valid contact email address.' });
        }

        // Basic URL validation
        const urlRegex = /^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|[a-zA-Z0-9]+\.[^\s]{2,})$/i;
        if (!urlRegex.test(website)) {
            await logError(new Error(`Invalid website URL: ${website}`), 'Agency Signup - Invalid URL', 'agency_signup_error.log');
            return res.status(400).json({ message: 'Please enter a valid website URL.' });
        }

        const inquiryId = nanoid();
        const inquiryData = {
            id: inquiryId,
            timestamp: new Date().toISOString(),
            agencyName,
            website,
            contactPerson,
            contactEmail,
            phoneNumber: phoneNumber || null,
            clientVolume: clientVolume || null,
            message: message || null,
        };

        try {
            await currentKv.set(`agency-inquiry:${inquiryId}`, JSON.stringify(inquiryData));
            console.log(`Agency inquiry stored in Vercel KV with ID: ${inquiryId}`);
            // Track the agency signup event
            // Mock req and res objects for trackEventHandler
            await trackEventHandler({
                method: 'POST',
                body: {
                    eventName: 'agency_signup',
                    eventData: {
                        agencyName,
                        website,
                        contactPerson,
                        contactEmail,
                        inquiryId
                    }
                }
            }, {
                status: () => ({ json: () => {} }) // Mock response for tracking
            });

            // Send email notification to hello@localseogen.com
            const emailSubject = `New Agency Inquiry: ${agencyName}`;
            const emailHtml = `
                <h2>New White-Label Agency Inquiry</h2>
                <p><strong>Agency Name:</strong> ${agencyName}</p>
                <p><strong>Website:</strong> <a href="${website}">${website}</a></p>
                <p><strong>Contact Person:</strong> ${contactPerson}</p>
                <p><strong>Contact Email:</strong> <a href="mailto:${contactEmail}">${contactEmail}</a></p>
                <p><strong>Phone Number:</strong> ${phoneNumber || 'N/A'}</p>
                <p><strong>Client Volume:</strong> ${clientVolume || 'N/A'}</p>
                <p><strong>Message:</strong></p>
                <p>${message || 'No message provided.'}</p>
            `;
            await sendEmail('hello@localseogen.com', emailSubject, emailHtml);

            res.status(200).json({ message: 'Inquiry submitted successfully. We will get back to you shortly.', inquiryId });
        } catch (error) {
            await logError(error, 'Agency Signup - KV Store Error', 'agency_signup_error.log');
            res.status(500).json({ message: 'Failed to submit inquiry due to a server error. Please try again later.' });
        }

    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
