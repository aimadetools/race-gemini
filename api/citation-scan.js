import { logError } from '../lib/logger.js';

export default async (req, res) => {
    // Enable CORS
    if (res.setHeader) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed.' });
    }

    const { name, address, phone } = req.body;

    if (!name || !address || !phone) {
        return res.status(400).json({ message: 'Name, address, and phone are required.' });
    }

    const openCageApiKey = process.env.OPENCAGE_API_KEY;

    // Helper to extract city from address string
    let city = '';
    const parts = address.split(',');
    if (parts.length >= 2) {
        // e.g. "123 Main St, Springfield, IL 62701" -> parts[1] is " Springfield"
        city = parts[parts.length - 2].trim();
        // remove zip/state code if present
        if (city.match(/^\d+$/) && parts.length >= 3) {
            city = parts[parts.length - 3].trim();
        }
    } else {
        city = address.trim();
    }

    // Default neighbouring towns mapping
    const cityFallbacks = {
        'austin': ['Round Rock', 'Pflugerville', 'Georgetown', 'Cedar Park', 'Leander', 'Kyle', 'Buda'],
        'miami': ['Miami Beach', 'Coral Gables', 'Hialeah', 'Key Biscayne', 'Doral', 'Pinecrest'],
        'los angeles': ['Santa Monica', 'Beverly Hills', 'Pasadena', 'Glendale', 'Burbank', 'El Segundo'],
        'new york': ['Brooklyn', 'Queens', 'Bronx', 'Hoboken', 'Jersey City', 'Union City'],
        'springfield': ['Shelbyville', 'Capital City', 'North Haverbrook', 'Ogdenville', 'Brockway']
    };

    let suggestedTowns = [];
    const lowerCity = city.toLowerCase();

    if (cityFallbacks[lowerCity]) {
        suggestedTowns = cityFallbacks[lowerCity];
    } else {
        // Fallback generator based on city name
        suggestedTowns = [
            `North ${city}`,
            `South ${city}`,
            `West ${city}`,
            `East ${city}`,
            `${city} Hills`
        ];
    }

    // If OpenCage is available, we can try to geocode and find nearby towns
    if (openCageApiKey && openCageApiKey !== 'your_opencage_api_key' && city) {
        try {
            const fetch = global.fetch;
            const geocodingUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(city)}&key=${openCageApiKey}`;
            const geocodingResponse = await fetch(geocodingUrl);
            if (geocodingResponse.ok) {
                const geocodingData = await geocodingResponse.json();
                if (geocodingData.results && geocodingData.results.length > 0) {
                    const { lat, lng } = geocodingData.results[0].geometry;
                    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:20000,${lat},${lng})[place~"city|town|suburb"];out;`;
                    const overpassResponse = await fetch(overpassUrl);
                    if (overpassResponse.ok) {
                        const overpassData = await overpassResponse.json();
                        if (overpassData.elements && overpassData.elements.length > 0) {
                            const towns = overpassData.elements
                                .map(el => el.tags && el.tags.name)
                                .filter(n => n && n.toLowerCase() !== city.toLowerCase());
                            const uniqueTowns = [...new Set(towns)].sort().slice(0, 6);
                            if (uniqueTowns.length > 0) {
                                suggestedTowns = uniqueTowns;
                            }
                        }
                    }
                }
            }
        } catch (err) {
            await logError(err, `citation-scan OpenCage/Overpass failed for city: ${city}`);
        }
    }

    // Determine mock statuses based on name and phone format
    const hasPhoneFormat = phone.includes('(') && phone.includes(')');
    const yelpStatus = hasPhoneFormat ? 'Consistent' : 'Mismatched';
    const yelpDetails = yelpStatus === 'Consistent' 
        ? 'Name, Address, and Phone match Yelp listing.'
        : 'Phone number format mismatch on Yelp. Listing has spaces/no-dashes.';

    const bingStatus = name.length % 2 === 0 ? 'Consistent' : 'Missing';
    const bingDetails = bingStatus === 'Consistent'
        ? 'Listing is verified and matches.'
        : 'Business listing not found on Bing';

    const yellowPagesStatus = address.toLowerCase().includes('street') || address.toLowerCase().includes('avenue') ? 'Mismatched' : 'Consistent';
    const yellowPagesDetails = yellowPagesStatus === 'Mismatched'
        ? 'Address abbreviation mismatch (Street/Avenue is spelled out fully).'
        : 'All NAP details consistent.';

    const foursquareStatus = name.length % 3 === 0 ? 'Consistent' : 'Missing';
    const foursquareDetails = foursquareStatus === 'Consistent'
        ? 'NAP consistency matches.'
        : 'Business listing not found on Foursquare.';

    const scanResults = [
        { directory: 'Google Maps / GBP', status: 'Consistent', details: 'Business listing matches verified Google Business Profile.' },
        { directory: 'Yelp', status: yelpStatus, details: yelpDetails },
        { directory: 'Facebook Business', status: 'Consistent', details: 'Page details match verified profile.' },
        { directory: 'Bing Places', status: bingStatus, details: bingDetails },
        { directory: 'YellowPages', status: yellowPagesStatus, details: yellowPagesDetails },
        { directory: 'Foursquare', status: foursquareStatus, details: foursquareDetails }
    ];

    const consistentCount = scanResults.filter(r => r.status === 'Consistent').length;
    const score = Math.round((consistentCount / scanResults.length) * 100);

    const failures = scanResults.filter(r => r.status !== 'Consistent').map(r => r.directory);

    const redirectUrl = `/generate.html?businessName=${encodeURIComponent(name)}&towns=${encodeURIComponent(suggestedTowns.join(', '))}&services=Local%20Services`;

    return res.status(200).json({
        name,
        address,
        phone,
        city,
        score,
        scanResults,
        failures,
        suggestedTowns,
        generatedRedirectUrl: redirectUrl
    });
};
