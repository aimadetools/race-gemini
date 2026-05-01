module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { email, auditResults } = req.body;

        if (!email || !auditResults) {
            return res.status(400).json({ message: 'Email and audit results are required.' });
        }

        console.log('Received audit report request:');
        console.log('Email:', email);
        console.log('Audit Results:', JSON.stringify(auditResults, null, 2));

        // In a real application, you would send an email here
        // e.g., using nodemailer, SendGrid, etc.

        res.status(200).json({ message: 'Audit report request received successfully.' });

    } catch (error) {
        console.error('Error in send-audit-report API:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};
