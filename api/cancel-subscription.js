import { kv } from '@vercel/kv';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { logError } from '../lib/logger.js';

export default async function handler(request, response) {
    if (request.method === 'POST') {
        try {
            const cookies = cookie.parse(request.headers.cookie || '');
            const token = cookies.token;

            if (!token) {
                await logError(new Error('Authentication token missing.'), 'Cancel Subscription - Authentication Error', 'cancel_subscription_error.log');
                return response.status(401).json({ message: 'Not authenticated.' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const agencyId = decoded.agencyId;

            if (!agencyId) {
                await logError(new Error('User is not an agency account.'), 'Cancel Subscription - Not Agency Account', 'cancel_subscription_error.log');
                return response.status(403).json({ message: 'Not an agency account.' });
            }

            const agency = await kv.get(`agency:${agencyId}`);
            if (!agency) {
                await logError(new Error(`Agency not found for agencyId: ${agencyId}`), 'Cancel Subscription - Agency Not Found', 'cancel_subscription_error.log');
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
            if (error instanceof jwt.JsonWebTokenError) {
                await logError(error, 'Cancel Subscription - JWT Error', 'cancel_subscription_error.log');
                return response.status(401).json({ message: 'Invalid token.' });
            }
            await logError(error, 'Cancel Subscription - General Error', 'cancel_subscription_error.log');
            return response.status(500).json({ message: 'Internal server error.' });
        }
    } else {
        response.setHeader('Allow', ['POST']);
        return response.status(405).end(`Method ${request.method} Not Allowed`);
    }
}