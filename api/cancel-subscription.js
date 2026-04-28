import { kv } from '@vercel/kv';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';

export default async function handler(request, response) {
    if (request.method === 'POST') {
        try {
            const cookies = cookie.parse(request.headers.cookie || '');
            const token = cookies.token;

            if (!token) {
                return response.status(401).json({ message: 'Not authenticated.' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const agencyId = decoded.agencyId;

            if (!agencyId) {
                return response.status(403).json({ message: 'Not an agency account.' });
            }

            const agency = await kv.get(`agency:${agencyId}`);
            if (!agency) {
                return response.status(404).json({ message: 'Agency not found.' });
            }

            // Update subscription status to cancelled
            agency.subscriptionStatus = 'cancelled';
            agency.planName = 'N/A';
            agency.monthlyCredits = 0;
            agency.renewalDate = null;
            agency.nextInvoiceAmount = null; // Clear next invoice amount

            await kv.set(`agency:${agencyId}`, agency);

            return response.status(200).json({ message: 'Subscription cancelled successfully.' });

        } catch (error) {
            console.error('Error cancelling subscription:', error);
            if (error instanceof jwt.JsonWebTokenError) {
                return response.status(401).json({ message: 'Invalid token.' });
            }
            return response.status(500).json({ message: 'Internal server error.' });
        }
    } else {
        response.setHeader('Allow', ['POST']);
        return response.status(405).end(`Method ${request.method} Not Allowed`);
    }
}