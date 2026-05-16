import { logError } from '../../lib/logger.js';

export default async (req, res) => {
    if (req.method === 'POST') {
        try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            await logError(new Error('All fields are required.'), 'Contact API - Validation Error', 'contact_error.log');
            return res.status(400).json({ message: 'All fields are required. Please fill them out.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            await logError(new Error(`Invalid email address format: ${email}`), 'Contact API - Invalid Email Format', 'contact_error.log');
            return res.status(400).json({ message: 'Please enter a valid email address.' });
        }

        await logError(null, `Contact form submission: Name: ${name}, Email: ${email}, Message: ${message}`, 'contact_success.log'); // Log successful submission
        res.status(200).json({ message: 'Message received successfully.' });
        } catch (error) { // Catch for main logic
        await logError(error, 'Contact API - General Error', 'contact_error.log');
        res.status(500).json({ message: 'An error occurred while processing your message.' });
        }
        } else {
        res.status(405).json({ message: 'Method Not Allowed' });
        }
        };
