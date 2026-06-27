import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { logError } from '../lib/logger.js';
import { computeLocalSeoGrid } from '../lib/seo-grid.js';

async function getTownsForCity(city) {
    const openCageApiKey = process.env.OPENCAGE_API_KEY;
    const cityFallbacks = {
        'austin': ['Round Rock', 'Pflugerville', 'Georgetown', 'Cedar Park', 'Leander', 'Kyle', 'Buda', 'Lakeway', 'Manor', 'Bee Cave'],
        'miami': ['Miami Beach', 'Coral Gables', 'Hialeah', 'Key Biscayne', 'Doral', 'Pinecrest', 'Kendall', 'Homestead', 'Opa-locka'],
        'los angeles': ['Santa Monica', 'Beverly Hills', 'Pasadena', 'Glendale', 'Burbank', 'El Segundo', 'Inglewood', 'Long Beach', 'Torrance'],
        'new york': ['Brooklyn', 'Queens', 'Bronx', 'Hoboken', 'Jersey City', 'Union City', 'Newark', 'Elizabeth', 'Yonkers'],
        'springfield': ['Shelbyville', 'Capital City', 'North Haverbrook', 'Ogdenville', 'Brockway']
    };

    const lowerCity = city.toLowerCase();
    let baseLat = 37.0902;
    let baseLng = -95.7129;
    let nearbyTowns = [];

    if (!openCageApiKey || openCageApiKey === 'your_opencage_api_key') {
        const fallbacks = cityFallbacks[lowerCity] || [
            `North ${city}`,
            `South ${city}`,
            `West ${city}`,
            `East ${city}`,
            `${city} Hills`,
            `${city} Junction`,
            `${city} Springs`,
            `${city} Valley`,
            `Greater ${city}`,
            `Central ${city}`
        ];
        return {
            baseLat,
            baseLng,
            nearbyTowns: fallbacks.map(name => ({ name }))
        };
    }

    try {
        const geocodingUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(city)}&key=${openCageApiKey}`;
        const geocodingResponse = await fetch(geocodingUrl);
        if (!geocodingResponse.ok) {
            throw new Error(`OpenCage API responded with status ${geocodingResponse.status}`);
        }
        const geocodingData = await geocodingResponse.json();
        if (geocodingData.results && geocodingData.results.length > 0) {
            baseLat = geocodingData.results[0].geometry.lat;
            baseLng = geocodingData.results[0].geometry.lng;
        }

        const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:25000,${baseLat},${baseLng})[place~"city|town|suburb|village|hamlet"];out;`;
        const overpassResponse = await fetch(overpassUrl);
        if (overpassResponse.ok) {
            const overpassData = await overpassResponse.json();
            if (overpassData.elements && overpassData.elements.length > 0) {
                const seen = new Set();
                const nearbyTownsWithCoords = [];
                overpassData.elements.forEach(el => {
                    const name = el.tags && el.tags.name;
                    if (name && name.toLowerCase() !== city.toLowerCase() && !seen.has(name.toLowerCase())) {
                        seen.add(name.toLowerCase());
                        nearbyTownsWithCoords.push({
                            name: name,
                            lat: el.lat,
                            lng: el.lon
                        });
                    }
                });
                nearbyTowns = nearbyTownsWithCoords;
            }
        }
    } catch (err) {
        await logError(err, `public-local-seo-grid geocoding/overpass failed for city: ${city}`);
    }

    if (nearbyTowns.length === 0) {
        const fallbacks = cityFallbacks[lowerCity] || [
            `North ${city}`,
            `South ${city}`,
            `West ${city}`,
            `East ${city}`,
            `${city} Hills`,
            `${city} Junction`,
            `${city} Springs`,
            `${city} Valley`,
            `Greater ${city}`,
            `Central ${city}`
        ];
        nearbyTowns = fallbacks.map(name => ({ name }));
    }

    return {
        baseLat,
        baseLng,
        nearbyTowns
    };
}

async function crawlWebsite(url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'LocalLeadsBot/1.0 (+https://localseogen.com)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
            const html = await response.text();
            const $ = cheerio.load(html);
            $('script, style, comment, iframe, noscript').remove();
            return $('body').text().replace(/\s+/g, ' ');
        }
    } catch (err) {
        // Ignore crawl error
    }
    return null;
}

export default async (req, res) => {
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

    const { businessName, userUrl, city, service } = req.body;

    if (!businessName || !city || !service) {
        return res.status(400).json({ message: 'Fields are required: businessName, city, service.' });
    }

    let normUserUrl = userUrl ? userUrl.trim() : '';
    if (normUserUrl && !/^https?:\/\//i.test(normUserUrl)) {
        normUserUrl = 'https://' + normUserUrl;
    }

    try {
        // 1. Get towns and geocoded coords around base city
        const { baseLat, baseLng, nearbyTowns } = await getTownsForCity(city);

        // 2. Optional: Crawl website if provided
        const userText = normUserUrl ? await crawlWebsite(normUserUrl) : null;
        const visibleTowns = [];
        
        if (userText) {
            nearbyTowns.forEach(t => {
                const name = t.name;
                const regex = new RegExp('\\b' + name.toLowerCase() + '\\b', 'i');
                if (regex.test(userText.toLowerCase())) {
                    visibleTowns.push(name);
                }
            });
        }

        // 3. Compute grid data
        const grid = computeLocalSeoGrid(city, baseLat, baseLng, nearbyTowns, visibleTowns);

        // For the public tool, let's inject a randomized search volume and deterministic ranks for opportunity/visible status.
        // We also want to provide overall stats.
        let opportunityCount = 0;
        let visibleCount = 0;
        let totalSearchVolume = 0;

        grid.forEach(cell => {
            if (cell.direction === 'CTR') {
                visibleCount++;
            } else if (cell.status === 'visible') {
                visibleCount++;
            } else {
                opportunityCount++;
                totalSearchVolume += cell.searchVolume;
            }
        });

        return res.status(200).json({
            success: true,
            businessName,
            userUrl: normUserUrl,
            city,
            service,
            baseLat,
            baseLng,
            grid,
            summary: {
                visibleCount,
                opportunityCount,
                totalSearchVolume,
                coveragePercentage: Math.round((visibleCount / grid.length) * 100)
            }
        });

    } catch (error) {
        await logError(error, 'Public Local SEO Grid Analysis Endpoint Error');
        return res.status(500).json({ message: 'Internal server error running local seo grid scan.' });
    }
};
