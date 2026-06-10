import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import { logError } from '../lib/logger.js';

export default async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { session_id } = req.query;

    if (!session_id) {
        return res.status(400).json({ message: 'Missing session_id query parameter.' });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (!session) {
            return res.status(404).json({ message: 'Stripe checkout session not found.' });
        }

        // Return only safe details required for analytics and tracking
        return res.status(200).json({
            transactionId: session.id,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || 'usd',
            paymentStatus: session.payment_status,
            mode: session.mode,
            productName: session.metadata.agencyPlanId || session.metadata.creditPackId || 'Page Credits'
        });
    } catch (error) {
        await logError(error, 'Get Session Details API Error');
        return res.status(500).json({ message: 'Internal server error.' });
    }
};
