import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';
import { computeLocalSeoGrid } from '../lib/seo-grid.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    let targetUserId;
    let baseCity = 'Home City';
    let baseLat = 37.0902;
    let baseLng = -95.7129;

    const { token } = req.query;

    if (token) {
        // Authenticate via shared portal token
        try {
            const clientResult = await query(
                'SELECT id, town FROM users WHERE share_token = $1',
                [token]
            );
            if (clientResult.rows.length === 0) {
                return res.status(404).json({ message: 'Shared portal not found or expired.' });
            }
            targetUserId = clientResult.rows[0].id;
            baseCity = clientResult.rows[0].town || 'Home City';
        } catch (authError) {
            await logError(authError, 'Local SEO Grid API - Share Token Verification Error', 'grid_error.log');
            return res.status(500).json({ message: 'Internal server error.' });
        }
    } else {
        // Authenticate via user JWT token cookie
        const cookies = parse(req.headers.cookie || '');
        const authToken = cookies.authToken;

        if (!authToken) {
            return res.status(401).json({ message: 'Not authenticated. Please log in.' });
        }

        try {
            const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
            const userId = decoded.userId;
            
            // Check if checking for a client (agency dashboard context)
            const { clientId } = req.query;
            if (clientId && parseInt(clientId) !== userId) {
                // Verify agency permission
                const agencyRes = await query('SELECT is_agency FROM users WHERE id = $1', [userId]);
                if (agencyRes.rows.length === 0 || !agencyRes.rows[0].is_agency) {
                    return res.status(403).json({ message: 'Unauthorized.' });
                }
                const clientRes = await query('SELECT id, town, agency_id FROM users WHERE id = $1', [clientId]);
                if (clientRes.rows.length === 0 || clientRes.rows[0].agency_id !== userId) {
                    return res.status(403).json({ message: 'Unauthorized.' });
                }
                targetUserId = parseInt(clientId);
                baseCity = clientRes.rows[0].town || 'Home City';
            } else {
                targetUserId = userId;
                const userRes = await query('SELECT town FROM users WHERE id = $1', [userId]);
                if (userRes.rows.length > 0) {
                    baseCity = userRes.rows[0].town || 'Home City';
                }
            }
        } catch (error) {
            await logError(error, 'Local SEO Grid API - JWT Verification Error', 'grid_error.log');
            return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
        }
    }

    try {
        // 1. Fetch geocoded center coordinates for the target user's home city
        const profileResult = await query(
            'SELECT lat, lng, city, address FROM business_profile WHERE user_id = $1 LIMIT 1',
            [targetUserId]
        );

        let addressString = baseCity;
        if (profileResult.rows.length > 0) {
            const profile = profileResult.rows[0];
            if (profile.lat !== null && profile.lng !== null) {
                baseLat = parseFloat(profile.lat);
                baseLng = parseFloat(profile.lng);
            }
            if (profile.city) {
                baseCity = profile.city;
            }
            if (profile.address) {
                addressString = profile.address;
            }
        }

        // If coordinates are still default, try to geocode the address
        if (baseLat === 37.0902 && baseLng === -95.7129) {
            const openCageApiKey = process.env.OPENCAGE_API_KEY;
            if (openCageApiKey) {
                try {
                    const geocodingUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(addressString)}&key=${openCageApiKey}`;
                    const geoRes = await fetch(geocodingUrl);
                    if (geoRes.ok) {
                        const geoData = await geoRes.json();
                        if (geoData.results && geoData.results.length > 0) {
                            baseLat = geoData.results[0].geometry.lat;
                            baseLng = geoData.results[0].geometry.lng;
                        }
                    }
                } catch (geoErr) {
                    console.error('Grid API geocoding failed:', geoErr);
                }
            }
        }

        // 2. Fetch all generated pages for this user to identify which towns are "visible"
        const pagesResult = await query(
            'SELECT town FROM seo_pages WHERE user_id = $1',
            [targetUserId]
        );
        const visibleTowns = pagesResult.rows.map(row => row.town);

        // 3. Get nearby towns list from Overpass or fallbacks
        let nearbyTowns = [];
        let nearbyTownsWithCoords = [];

        try {
            const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:25000,${baseLat},${baseLng})[place~"city|town|suburb|village|hamlet"];out;`;
            const overpassResponse = await fetch(overpassUrl);
            if (overpassResponse && overpassResponse.ok) {
                const overpassData = await overpassResponse.json();
                if (overpassData && overpassData.elements && overpassData.elements.length > 0) {
                    const seen = new Set();
                    overpassData.elements.forEach(el => {
                        const name = el.tags && el.tags.name;
                        if (name && name.toLowerCase() !== baseCity.toLowerCase() && !seen.has(name.toLowerCase())) {
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
        } catch (overpassErr) {
            console.error('Grid API Overpass fetch failed, using fallbacks:', overpassErr);
        }

        if (nearbyTowns.length === 0) {
            const cityFallbacks = {
                'austin': ['Round Rock', 'Pflugerville', 'Georgetown', 'Cedar Park', 'Leander', 'Kyle', 'Buda', 'Lakeway', 'Manor', 'Bee Cave'],
                'miami': ['Miami Beach', 'Coral Gables', 'Hialeah', 'Key Biscayne', 'Doral', 'Pinecrest', 'Kendall', 'Homestead', 'Opa-locka'],
                'los angeles': ['Santa Monica', 'Beverly Hills', 'Pasadena', 'Glendale', 'Burbank', 'El Segundo', 'Inglewood', 'Long Beach', 'Torrance'],
                'new york': ['Brooklyn', 'Queens', 'Bronx', 'Hoboken', 'Jersey City', 'Union City', 'Newark', 'Elizabeth', 'Yonkers']
            };
            const lowerCity = baseCity.toLowerCase();
            nearbyTowns = cityFallbacks[lowerCity] || [
                `North ${baseCity}`,
                `South ${baseCity}`,
                `West ${baseCity}`,
                `East ${baseCity}`,
                `${baseCity} Hills`,
                `${baseCity} Junction`,
                `${baseCity} Springs`
            ];
        }

        // 4. Compute the grid data
        const grid = computeLocalSeoGrid(baseCity, baseLat, baseLng, nearbyTowns, visibleTowns);

        return res.status(200).json({
            baseCity,
            baseLat,
            baseLng,
            grid
        });

    } catch (error) {
        await logError(error, 'Local SEO Grid GET - General Error', 'grid_error.log');
        return res.status(500).json({ message: 'Internal server error.' });
    }
}
