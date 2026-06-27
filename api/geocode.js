import { geocodeAddress } from '../lib/geocoding.js';
import { logError } from '../lib/logger.js';

export default async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const address = req.method === 'GET' ? req.query.address : req.body.address;

    if (!address || typeof address !== 'string' || address.trim() === '') {
        return res.status(400).json({ message: 'Address is required.' });
    }

    try {
        const coords = await geocodeAddress(address);
        if (coords) {
            return res.status(200).json({ success: true, ...coords });
        } else {
            return res.status(404).json({ success: false, message: 'Could not resolve address location. Please enter coordinates manually.' });
        }
    } catch (error) {
        await logError(error, `Geocoding endpoint failure for address: ${address}`);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
