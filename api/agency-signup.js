import { kv } from '@vercel/kv';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const { agencyName, website, contactPerson, contactEmail, phoneNumber, clientVolume, message } = req.body;

        // Basic validation
        if (!agencyName || !website || !contactPerson || !contactEmail) {
            return res.status(400).json({ message: 'Agency Name, Website, Contact Person, and Contact Email are required.' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactEmail)) {
            return res.status(400).json({ message: 'Please enter a valid contact email address.' });
        }

        // Basic URL validation
        const urlRegex = /^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|[a-zA-Z0-9]+\.[^\s]{2,})$/i;
        if (!urlRegex.test(website)) {
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
            await kv.set(`agency-inquiry:${inquiryId}`, JSON.stringify(inquiryData));
            console.log(`Agency inquiry stored in Vercel KV with ID: ${inquiryId}`);
            res.status(200).json({ message: 'Inquiry submitted successfully. We will get back to you shortly.', inquiryId });
        } catch (error) {
            console.error('Failed to store agency inquiry in Vercel KV:', error);
            res.status(500).json({ message: 'Failed to submit inquiry due to a server error. Please try again later.' });
        }

    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
