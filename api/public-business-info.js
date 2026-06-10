import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { clientId } = req.query;

    if (!clientId) {
        return res.status(400).json({ message: 'Missing required parameter: clientId.' });
    }

    const userIdNum = parseInt(clientId, 10);
    if (isNaN(userIdNum)) {
        return res.status(400).json({ message: 'Invalid clientId.' });
    }

    try {
        const userResult = await query('SELECT name, logo_url, is_agency, agency_id FROM users WHERE id = $1', [userIdNum]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Business not found.' });
        }

        const user = userResult.rows[0];
        let businessName = user.name || 'Local Business';
        let logoUrl = user.logo_url || null;

        if (user.agency_id) {
            const agencyResult = await query('SELECT name, logo_url FROM users WHERE id = $1', [user.agency_id]);
            if (agencyResult.rows.length > 0) {
                const agency = agencyResult.rows[0];
                logoUrl = agency.logo_url || logoUrl;
                businessName = user.name || agency.name || 'Local Business';
            }
        }

        // Also fetch page count to show dynamic context
        const pagesResult = await query('SELECT COUNT(*) as count FROM seo_pages WHERE user_id = $1', [userIdNum]);
        const pagesCount = parseInt(pagesResult.rows[0].count || 0, 10);

        return res.status(200).json({
            businessName,
            logoUrl,
            pagesCount
        });
    } catch (error) {
        await logError(error, 'Public Business Info Fetch Error');
        return res.status(500).json({ message: 'Internal server error.' });
    }
};
