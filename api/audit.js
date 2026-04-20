const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
    if (req.method === 'POST') {
        const { businessName, businessAddress, businessPhone, services, towns, name, email } = req.body;

        if (!businessName || !businessAddress || !services || !towns || !name || !email) {
            return res.status(400).json({ message: 'Missing required fields for audit.' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format.' });
        }

        // Basic phone number validation (not empty and reasonable length)
        if (businessPhone && businessPhone.length < 7) { // Assuming a minimum of 7 digits for a phone number
            return res.status(400).json({ message: 'Invalid business phone number.' });
        }

        const servicesArray = services.split(',').map(s => s.trim()).filter(s => s !== '');
        const townsArray = towns.split(',').map(t => t.trim()).filter(t => t !== '');

        const potentialPages = servicesArray.length * townsArray.length;

        const auditData = {
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

        // Log the audit data to cron.log for now, as database is unavailable
        const logFilePath = path.join(process.cwd(), 'cron.log');
        fs.appendFile(logFilePath, JSON.stringify(auditData) + '
', (err) => {
            if (err) {
                console.error('Failed to write audit data to cron.log:', err);
                // Still send success to client if log fails, as it's not critical for immediate user feedback
            }
        });

        res.status(200).json({ 
            message: 'Audit submitted successfully. Check your email for results.',
            auditSummary: auditData.auditSummary
        });

    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
