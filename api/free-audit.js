const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ message: 'URL is required.' });
    }

    try {
        new URL(url);
    } catch (error) {
        return res.status(400).json({ message: 'Invalid URL format.' });
    }

    try {
        const response = await fetch(url);
        const html = await response.text();

        // This is a very simple regex and will likely fail on many sites.
        // A more robust solution would use a library like cheerio to parse the HTML
        // and look for address tags or microformats.
        const addressRegex = /<address>(.*?)<\/address>/is;
        const addressMatch = html.match(addressRegex);
        
        let address = null;
        if (addressMatch && addressMatch[1]) {
            address = addressMatch[1].replace(/<br>/g, ', ').replace(/
/g, '').trim();
        }

        // Mocked data for now. In a real implementation, we would use a geocoding API
        // to get the lat/lon of the address and then a nearby places API to find towns.
        const foundPages = [
            'plumbers-in-springfield',
            'emergency-plumbing-shelbyville'
        ];

        const missedOpportunities = [
            'capital-city',
            'north-haverbrook',
            'ogdenville'
        ];

        res.status(200).json({
            address,
            foundPages,
            missedOpportunities,
        });

    } catch (error) {
        console.error('An unexpected error occurred during the free audit:', error);
        return res.status(500).json({
            message: 'An unexpected error occurred during the audit process.',
            error: error.message
        });
    }
};
