import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

async function handler(req, res) {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.authToken || cookies.token || cookies.auth;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    let userId;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId || decoded.agencyId;
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

    if (!userId) {
        return res.status(400).json({ message: 'Invalid token payload' });
    }

    if (req.method === 'GET') {
        try {
            const result = await query(
                'SELECT business_profile FROM users WHERE id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'User profile not found' });
            }

            const profile = result.rows[0].business_profile || null;
            return res.status(200).json({ profile });
        } catch (error) {
            await logError(error, 'Get Business Profile - General Error');
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    if (req.method === 'POST') {
        try {
            const profile = req.body;
            if (!profile || typeof profile !== 'object') {
                return res.status(400).json({ message: 'Profile payload must be a valid JSON object' });
            }

            // Simple validation
            if (!profile.name || typeof profile.name !== 'string' || profile.name.trim() === '') {
                return res.status(400).json({ message: 'Business name is required' });
            }

            const name = profile.name.trim();
            const type = profile.type || 'LocalBusiness';
            const phone = profile.phone || '';
            const email = profile.email || '';
            const description = profile.description || '';
            const website = profile.website || '';
            const address = profile.address || {};
            const socials = Array.isArray(profile.socials) ? profile.socials : [];
            const hours = Array.isArray(profile.hours) ? profile.hours : [];
            let coordinates = profile.coordinates || null;

            // Geocoding fallback if coordinates are missing but address is provided
            const hasAddressText = address.streetAddress || address.addressLocality;
            const openCageApiKey = process.env.OPENCAGE_API_KEY;

            if (!coordinates && hasAddressText && openCageApiKey && openCageApiKey !== 'your_opencage_api_key') {
                const queryParts = [
                    address.streetAddress,
                    address.addressLocality,
                    address.addressRegion,
                    address.postalCode,
                    address.addressCountry
                ].filter(Boolean);

                if (queryParts.length > 0) {
                    const fullAddressStr = queryParts.join(', ');
                    try {
                        const geocodingUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(fullAddressStr)}&key=${openCageApiKey}`;
                        const geocodingResponse = await fetch(geocodingUrl);
                        if (geocodingResponse.ok) {
                            const geocodingData = await geocodingResponse.json();
                            if (geocodingData.results && geocodingData.results.length > 0) {
                                const location = geocodingData.results[0].geometry;
                                coordinates = {
                                    latitude: parseFloat(location.lat),
                                    longitude: parseFloat(location.lng)
                                };
                            }
                        }
                    } catch (geoError) {
                        console.error('Failed to geocode address in business profile setup:', geoError);
                        // Suppress error and let update proceed without coordinates
                    }
                }
            }

            const cleanedProfile = {
                name,
                type,
                phone,
                email,
                description,
                website,
                address: {
                    streetAddress: address.streetAddress || '',
                    addressLocality: address.addressLocality || '',
                    addressRegion: address.addressRegion || '',
                    postalCode: address.postalCode || '',
                    addressCountry: address.addressCountry || ''
                },
                coordinates,
                hours,
                socials
            };

            // Update in PostgreSQL
            const pgResult = await query(
                'UPDATE users SET business_profile = $1 WHERE id = $2 RETURNING id',
                [JSON.stringify(cleanedProfile), userId]
            );

            if (pgResult.rows.length === 0) {
                return res.status(404).json({ message: 'User account not found' });
            }

            return res.status(200).json({
                message: 'Business profile updated successfully',
                profile: cleanedProfile
            });

        } catch (error) {
            await logError(error, 'Update Business Profile - General Error');
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default handler;
