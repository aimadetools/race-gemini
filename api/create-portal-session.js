import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError, logInfo } from '../lib/logger.js';

export default async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.authToken || cookies.token || cookies.auth;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Invalid token payload' });
        }

        // Fetch user from PostgreSQL
        const userResult = await query(
            'SELECT id, email, stripe_customer_id, stripe_subscription_id, is_agency FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];
        let customerId = user.stripe_customer_id;

        // 1. If customerId is not in DB, check if stripe_subscription_id exists
        if (!customerId && user.stripe_subscription_id) {
            try {
                const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
                if (subscription && subscription.customer) {
                    customerId = subscription.customer;
                }
            } catch (err) {
                await logError(err, 'Stripe Subscription Fetch Error in Billing Portal Session Creation');
            }
        }

        // 2. If customerId is still not found, search Stripe by email
        if (!customerId) {
            try {
                const customers = await stripe.customers.list({ email: user.email, limit: 1 });
                if (customers.data.length > 0) {
                    customerId = customers.data[0].id;
                }
            } catch (err) {
                await logError(err, 'Stripe Customer Search Error in Billing Portal Session Creation');
            }
        }

        // 3. If customerId is still not found, return 400
        if (!customerId) {
            return res.status(400).json({ message: 'No Stripe billing profile found. Please purchase credits or a subscription first.' });
        }

        // Save customerId to user in DB if not already saved
        if (!user.stripe_customer_id) {
            await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId]);
            await logInfo(`Updated user ${userId} with stripe_customer_id: ${customerId}`, 'Stripe Customer Update');
        }

        const host = req.headers.host || 'localseogen.com';
        const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;
        
        // Return URL: redirect to appropriate dashboard
        const returnUrl = user.is_agency 
            ? `${baseUrl}/agency-subscription.html` 
            : `${baseUrl}/dashboard.html`;

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        return res.status(200).json({ url: session.url });

    } catch (error) {
        await logError(error, 'Stripe Billing Portal Session Creation Failed');
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};
