const fetch = global.fetch;
import { logError } from '../lib/logger.js';
import { parseAddress } from '../lib/html-parser.js';
import { exec } from 'child_process';

export default async (req, res) => {
    // Enable CORS
    if (res.setHeader) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

            const service = req.query.service || 'plumbers';
            const baseCity = city ? city.toLowerCase().replace(/ /g, '-') : '';

            // Query Overpass API for nearby places
            let nearbyTowns = [];
            try {
                const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:25000,${lat},${lng})[place~"city|town|suburb|village|hamlet"];out;`;
                const overpassResponse = await fetch(overpassUrl);
                if (overpassResponse && overpassResponse.ok) {
                    const overpassData = await overpassResponse.json();
                    if (overpassData && overpassData.elements && overpassData.elements.length > 0) {
                        const towns = overpassData.elements
                            .map(el => el.tags && el.tags.name)
                            .filter(name => name && name.toLowerCase() !== city.toLowerCase());
                        nearbyTowns = [...new Set(towns)].sort().slice(0, 15);
                    }
                }
            } catch (overpassErr) {
                console.error('Overpass API fetch failed, using fallbacks:', overpassErr);
            }

            // Fallback list of towns if Overpass yields nothing
            if (!nearbyTowns || nearbyTowns.length === 0) {
                const cityFallbacks = {
                    'austin': ['Round Rock', 'Pflugerville', 'Georgetown', 'Cedar Park', 'Leander', 'Kyle', 'Buda', 'Lakeway', 'Manor', 'Bee Cave'],
                    'miami': ['Miami Beach', 'Coral Gables', 'Hialeah', 'Key Biscayne', 'Doral', 'Pinecrest', 'Kendall', 'Homestead', 'Opa-locka'],
                    'los angeles': ['Santa Monica', 'Beverly Hills', 'Pasadena', 'Glendale', 'Burbank', 'El Segundo', 'Inglewood', 'Long Beach', 'Torrance'],
                    'new york': ['Brooklyn', 'Queens', 'Bronx', 'Hoboken', 'Jersey City', 'Union City', 'Newark', 'Elizabeth', 'Yonkers'],
                    'springfield': ['Shelbyville', 'Capital City', 'North Haverbrook', 'Ogdenville', 'Brockway']
                };
                const lowerCity = city ? city.toLowerCase() : '';
                nearbyTowns = cityFallbacks[lowerCity] || [
                    `North ${city}`,
                    `South ${city}`,
                    `West ${city}`,
                    `East ${city}`,
                    `${city} Hills`,
                    `${city} Junction`,
                    `${city} Springs`
                ];
            }

            const locationsDb = nearbyTowns.join(',');

            let foundPages = [];
            let missedOpportunities = [];

            try {
                const pythonCommand = `python scripts/auditor_cli.py locations "${url}" --locations-db "${locationsDb}"`;
                const { stdout, stderr } = await new Promise((resolve, reject) => {
                    exec(pythonCommand, { cwd: process.cwd() }, (error, stdout, stderr) => { // Added cwd
                        if (error) {
                            return reject(error);
                        }
                        resolve({ stdout, stderr });
                    });
                });

                if (stderr) {
                    console.error(`Python script stderr: ${stderr}`);
                }

                const auditOutput = JSON.parse(stdout);

                if (auditOutput && auditOutput.results) {
                    foundPages = auditOutput.results.locations_found.map(loc => `${service}-in-${loc.toLowerCase().replace(/ /g, '-')}`);
                    missedOpportunities = auditOutput.results.locations_not_found.map(loc => `${service}-in-${loc.toLowerCase().replace(/ /g, '-')}`);
                } else {
                    await logError(new Error(`Python audit did not return expected results for URL: ${url}`), 'Free Audit - Python Output Error', 'free_audit_error.log');
                }

            } catch (pythonError) {
                await logError(pythonError, 'Free Audit - Python Audit Execution Error', 'free_audit_error.log');
                // Fallback to simpler logic or return an error to the client
                foundPages = city ? [`${service}-in-${baseCity}`] : [];
                missedOpportunities = nearbyTowns.filter(town => town.toLowerCase().replace(/ /g, '-') !== baseCity).map(loc => `${service}-in-${loc.toLowerCase().replace(/ /g, '-')}`);
            }

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
};
