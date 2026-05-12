const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cheerio = require('cheerio');
const { logError } = require('../../lib/logger');

function parseAddress(html) {
    const $ = cheerio.load(html);

    // Attempt 1: Look for schema.org microdata for structured address
    const schemaAddress = $('[itemtype="http://schema.org/PostalAddress"]');
    if (schemaAddress.length) {
        const streetAddress = schemaAddress.find('[itemprop="streetAddress"]').text();
        const addressLocality = schemaAddress.find('[itemprop="addressLocality"]').text();
        const addressRegion = schemaAddress.find('[itemprop="addressRegion"]').text();
        const postalCode = schemaAddress.find('[itemprop="postalCode"]').text();
        const addressCountry = schemaAddress.find('[itemprop="addressCountry"]').text();

        const parts = [streetAddress, addressLocality, addressRegion, postalCode, addressCountry].filter(Boolean);
        if (parts.length > 0) {
            return parts.join(', ').replace(/\s+/g, ' ').trim();
        }
    }

    // Attempt 2: Fallback to general itemprop="address" text extraction
    let address = $('[itemprop="address"]').text();
    if (address) return address.replace(/\s+/g, ' ').trim();

    // Attempt 3: Look for h-card microformat
    address = $('.h-card').text();
    if (address) return address.replace(/\s+/g, ' ').trim();

    // Attempt 4: Look for vCard microformat
    address = $('.vcard').text();
    if (address) return address.replace(/\s+/g, ' ').trim();

    // Attempt 5: Look for <address> tag
    address = $('address').text();
    if (address) return address.replace(/\s+/g, ' ').trim();

    return null;
}


module.exports = async (req, res) => {
    const { url } = req.query;
    const openCageApiKey = process.env.OPENCAGE_API_KEY;
    const geoapifyApiKey = process.env.GEOAPIFY_API_KEY;

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

            let missedOpportunities = [];
            if (geoapifyApiKey && geoapifyApiKey !== 'your_geoapify_api_key') {
                const nearbyPlacesUrl = `https://api.geoapify.com/v2/places?categories=populated_place&filter=circle:${lng},${lat},50000&limit=5&apiKey=${geoapifyApiKey}`;
                const nearbyPlacesResponse = await fetch(nearbyPlacesUrl);
                const nearbyPlacesData = await nearbyPlacesResponse.json();
                missedOpportunities = nearbyPlacesData.features.map(place => place.properties.name);
            }
            
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
