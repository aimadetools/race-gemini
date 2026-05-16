import pg from 'pg'; // Import the pg library correctly
const { Pool } = pg; // Destructure Pool from the imported pg object
import { logError } from '../../lib/logger.js'; // Note the .js extension for relative imports

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed.' });
    }

    const { email, url } = req.body;

    if (!email || !url) {
        await logError(new Error('Email and URL are required.'), 'Capture Email - Validation Error', 'capture_email_error.log');
        return res.status(400).json({ message: 'Email and URL are required.' });
    }

    try {
        const client = await pool.connect();
        const result = await client.query(
            'INSERT INTO leads (email, url, source) VALUES ($1, $2, $3) RETURNING *',
            [email, url, 'free-audit']
        );
        client.release();
        res.status(201).json({ message: 'Email captured successfully.', data: result.rows[0] });
    } catch (error) {
        await logError(error, 'Capture Email - Database Error', 'capture_email_error.log');
        res.status(500).json({ message: 'An error occurred while capturing the email.' });
    }
};
