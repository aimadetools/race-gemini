const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed.' });
    }

    const { email, url } = req.body;

    if (!email || !url) {
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
        console.error('Error saving lead to the database:', error);
        res.status(500).json({ message: 'An error occurred while capturing the email.' });
    }
};
