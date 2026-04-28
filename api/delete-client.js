import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method === 'POST') {
        const { clientId } = request.body;

        if (!clientId) {
            return response.status(400).json({ message: 'Client ID is required.' });
        }

        try {
            const sessionToken = request.cookies.session;
            if (!sessionToken) {
                return response.status(401).json({ message: 'Not authenticated.' });
            }

            const agency = await kv.hgetall(`agency_sessions:${sessionToken}`);
            if (!agency || !agency.id) {
                return response.status(401).json({ message: 'Agency session invalid.' });
            }

            // Verify client belongs to this agency
            const agencyClients = await kv.hgetall(`agency:${agency.id}:clients`);
            if (!agencyClients || !agencyClients[clientId]) {
                return response.status(404).json({ message: 'Client not found or does not belong to this agency.' });
            }

            // Get client data to find associated pages
            const clientData = JSON.parse(agencyClients[clientId]);
            const clientPages = clientData.pages || {};

            // Delete all pages associated with the client
            const pageKeysToDelete = Object.keys(clientPages).map(pageId => `page:${pageId}`);
            if (pageKeysToDelete.length > 0) {
                await kv.del(...pageKeysToDelete);
            }

            // Remove client from the agency's client list
            await kv.hdel(`agency:${agency.id}:clients`, clientId);

            // Decrement client count and pages generated count from agency stats
            const currentAgencyStats = await kv.hgetall(`agency:${agency.id}:stats`);
            const totalClients = (parseInt(currentAgencyStats?.totalClients) || 1) - 1;
            const totalPagesGenerated = (parseInt(currentAgencyStats?.totalPagesGenerated) || 0) - Object.keys(clientPages).length;

            await kv.hset(`agency:${agency.id}:stats`, {
                totalClients: Math.max(0, totalClients),
                totalPagesGenerated: Math.max(0, totalPagesGenerated)
            });

            return response.status(200).json({ message: 'Client and associated data deleted successfully.' });

        } catch (error) {
            console.error('Error deleting client:', error);
            return response.status(500).json({ message: 'Internal server error.' });
        }
    } else {
        response.setHeader('Allow', ['POST']);
        return response.status(405).end(`Method ${request.method} Not Allowed`);
    }
}
