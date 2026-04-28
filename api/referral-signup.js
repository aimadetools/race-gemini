import { kv } from '@vercel/kv';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const { yourName, yourEmail, companyName, website, monthlyReferrals, message } = req.body;

        // Basic validation
        if (!yourName || !yourEmail) {
            return res.status(400).json({ message: 'Your Name and Your Email are required.' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(yourEmail)) {
            return res.status(400).json({ message: 'Please enter a valid email address.' });
        }

        // Basic URL validation (if website is provided)
        if (website) {
            const urlRegex = /^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|[a-zA-Z0-9]+\.[^\s]{2,})$/i;
            if (!urlRegex.test(website)) {
                return res.status(400).json({ message: 'Please enter a valid website URL.' });
            }
        }

        const inquiryId = nanoid();
        const inquiryData = {
            id: inquiryId,
            timestamp: new Date().toISOString(),
            yourName,
            yourEmail,
            companyName: companyName || null,
            website: website || null,
            monthlyReferrals: monthlyReferrals || null,
            message: message || null,
        };

        try {
            await kv.set(`referral-inquiry:${inquiryId}`, JSON.stringify(inquiryData));
            console.log(`Referral inquiry stored in Vercel KV with ID: ${inquiryId}`);
            res.status(200).json({ message: 'Referral inquiry submitted successfully. We will get back to you shortly.', inquiryId });
        } catch (error) {
            console.error('Failed to store referral inquiry in Vercel KV:', error);
            res.status(500).json({ message: 'Failed to submit inquiry due to a server error. Please try again later.' });
        }

    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
