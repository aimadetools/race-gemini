const fetch = global.fetch;
const { logError } = require('../../lib/logger');
const { parseAddress } = require('../../lib/html-parser');

module.exports = async (req, res) => {
    const { url } = req.query;
    const openCageApiKey = process.env.OPENCAGE_API_KEY;

    if (!openCageApiKey || openCageApiKey === 'your_opencage_api_key') {
        await logError(new Error('OpenCage API key is not set or is a placeholder.'), 'Free Audit - Missing OpenCage API Key', 'free_audit_error.log');
        return res.status(503).json({ message: 'Geocoding service is unavailable: OPENCAGE_API_KEY is not configured.' });
    }

    if (!url) {
        await logError(new Error('URL is required.'), 'Free Audit - Missing URL', 'free_audit_error.log');
        return res.status(400).json({ message: 'URL is required.' });
    }

    try {
        new URL(url);
    } catch (error) {
        await logError(new Error(`Invalid URL format: ${url}`), 'Free Audit - Invalid URL Format', 'free_audit_error.log');
        return res.status(400).json({ message: 'Invalid URL format.' });
    }

    try {
        const response = await fetch(url);
        const html = await response.text();

        const address = parseAddress(html);

        if (!address) {
            await logError(new Error(`Could not find an address on the page for URL: ${url}`), 'Free Audit - Address Not Found', 'free_audit_error.log');
            return res.status(404).json({ message: 'Could not find an address on the page.' });
        }

        const geocodingUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${openCageApiKey}`;
        const geocodingResponse = await fetch(geocodingUrl);
        const geocodingData = await geocodingResponse.json();

        if (geocodingData.results && geocodingData.results.length > 0) {
            const { lat, lng } = geocodingData.results[0].geometry;
            const city = geocodingData.results[0].components.city || geocodingData.results[0].components.town || geocodingData.results[0].components.village;

            const missedOpportunities = [];
            
            const foundPages = city ? [`plumbers-in-${city.toLowerCase().replace(/ /g, '-')}`] : [];

            res.status(200).json({
                address,
                lat,
                lng,
                foundPages,
                missedOpportunities,
            });
        } else {
            await logError(new Error(`Could not geocode the address for: ${address}`), 'Free Audit - Geocoding Failed', 'free_audit_error.log');
            res.status(404).json({ message: 'Could not geocode the address.' });
        }

    } catch (error) {
        await logError(error, 'Free Audit - General Error', 'free_audit_error.log');
        return res.status(500).json({
            message: 'An unexpected error occurred during the audit process.',
            error: error.message
        });
    }
};};
