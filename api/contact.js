module.exports = (req, res) => {
    if (req.method === 'POST') {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'All fields are required. Please fill them out.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address.' });
        }

        console.log('Contact form submission:', { name, email, message });
        res.status(200).json({ message: 'Message received successfully.' });
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
};
