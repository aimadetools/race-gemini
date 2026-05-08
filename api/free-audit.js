const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cheerio = require('cheerio');

function parseAddress(html) {
    const $ = cheerio.load(html);

    // Attempt 1: Look for schema.org microdata
    let address = $('[itemprop="address"]').text();
    if (address) return address.replace(/\s+/g, ' ').trim();

    // Attempt 2: Look for h-card microformat
    address = $('.h-card').text();
    if (address) return address.replace(/\s+/g, ' ').trim();

    // Attempt 3: Look for vCard microformat
    address = $('.vcard').text();
    if (address) return address.replace(/\s+/g, ' ').trim();

    // Attempt 4: Look for <address> tag
    address = $('address').text();
    if (address) return address.replace(/\s+/g, ' ').trim();

    return null;
}


module.exports = async (req, res) => {
    const { url } = req.query;
    const openCageApiKey = process.env.OPENCAGE_API_KEY;
    const geoapifyApiKey = process.env.GEOAPIFY_API_KEY;

    if (!openCageApiKey || openCageApiKey === 'your_opencage_api_key') {
        console.error('OpenCage API key is not set.');
        return res.status(500).json({ message: 'Server configuration error: Geocoding service is not available.' });
    }

    if (!geoapifyApiKey || geoapifyApiKey === 'your_geoapify_api_key') {
        console.error('Geoapify API key is not set.');
        return res.status(500).json({ message: 'Server configuration error: Nearby places service is not available.' });
    }

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

        const address = parseAddress(html);

        if (!address) {
            return res.status(404).json({ message: 'Could not find an address on the page.' });
        }

        const geocodingUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${openCageApiKey}`;
        const geocodingResponse = await fetch(geocodingUrl);
        const geocodingData = await geocodingResponse.json();

        if (geocodingData.results && geocodingData.results.length > 0) {
            const { lat, lng } = geocodingData.results[0].geometry;
            const city = geocodingData.results[0].components.city || geocodingData.results[0].components.town || geocodingData.results[0].components.village;

            const nearbyPlacesUrl = `https://api.geoapify.com/v2/places?categories=populated_place&filter=circle:${lng},${lat},50000&limit=5&apiKey=${geoapifyApiKey}`;
            const nearbyPlacesResponse = await fetch(nearbyPlacesUrl);
            const nearbyPlacesData = await nearbyPlacesResponse.json();
            
            const missedOpportunities = nearbyPlacesData.features.map(place => place.properties.name);
            
            const foundPages = city ? [`plumbers-in-${city.toLowerCase().replace(/ /g, '-')}`] : [];

            res.status(200).json({
                address,
                lat,
                lng,
                foundPages,
                missedOpportunities,
            });
        } else {
            res.status(404).json({ message: 'Could not geocode the address.' });
        }

    } catch (error) {
        console.error('An unexpected error occurred during the free audit:', error);
        return res.status(500).json({
            message: 'An unexpected error occurred during the audit process.',
            error: error.message
        });
    }
};};
