import { kv } from '@vercel/kv';

export default async function handler(request, response) {
    if (request.method === 'POST') {
        const { clientId, name, email } = request.body;

        if (!clientId || !name || !email) {
            return response.status(400).json({ message: 'Client ID, name, and email are required.' });
        }

        try {
            // Retrieve the agency and its clients
            const sessionToken = request.cookies.session;
            if (!sessionToken) {
                return response.status(401).json({ message: 'Not authenticated.' });
            }

            const agency = await kv.hgetall(`agency_sessions:${sessionToken}`);
            if (!agency || !agency.id) {
                return response.status(401).json({ message: 'Agency session invalid.' });
            }

            const agencyClients = await kv.hgetall(`agency:${agency.id}:clients`);
            if (!agencyClients || !agencyClients[clientId]) {
                return response.status(404).json({ message: 'Client not found.' });
            }

            // Parse the client data, update, and stringify
            let clientData = JSON.parse(agencyClients[clientId]);
            clientData.name = name;
            clientData.email = email;

            // Update the client in KV
            await kv.hset(`agency:${agency.id}:clients`, { [clientId]: JSON.stringify(clientData) });

            return response.status(200).json({ message: 'Client updated successfully.' });

        } catch (error) {
            console.error('Error updating client:', error);
            return response.status(500).json({ message: 'Internal server error.' });
        }
    } else {
        response.setHeader('Allow', ['POST']);
        return response.status(405).end(`Method ${request.method} Not Allowed`);
    }
}
