const { query } = require('../db/index.js');
const { sendEmail } = require('../../lib/email');

const LOW_CREDIT_THRESHOLD = 10;

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            // Secure this endpoint with a secret
            const { authorization } = req.headers;
            if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { rows: users } = await query(
                'SELECT id, email, credits FROM users WHERE credits > 0 AND credits <= $1',
                [LOW_CREDIT_THRESHOLD]
            );

            for (const user of users) {
                const subject = 'Low Credit Balance Alert';
                const html = `<p>Your credit balance is low (${user.credits}). Please purchase more credits to continue using our services.</p>`;
                await sendEmail(user.email, subject, html);
            }

            res.status(200).json({ message: `Sent ${users.length} low balance alerts.` });
        } catch (error) {
            console.error('Error sending low balance alerts:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end('Method Not Allowed');
    }
}
