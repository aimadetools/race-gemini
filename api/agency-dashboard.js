const cookie = require('cookie');
const jwt = require('jsonwebtoken');
import { query } from '../db/index.js'; // Import PostgreSQL query utility
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Import Stripe

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.authToken; // Use authToken as defined in checkout.js

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId; // agencyId is the userId

        if (!userId) {
            return res.status(403).json({ message: 'Not an authenticated user' });
        }

        // Fetch user (agency) data from PostgreSQL
        const userResult = await query(
            'SELECT id, name, email, credits, subscription_status, stripe_subscription_id, logo_url, primary_color FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Agency user not found' });
        }

        const agencyUser = userResult.rows[0];
        let planName = 'N/A';
        let monthlyCredits = 'N/A';
        let renewalDate = null;

        if (agencyUser.stripe_subscription_id) {
            try {
                const subscription = await stripe.subscriptions.retrieve(agencyUser.stripe_subscription_id);
                // Assuming one item per subscription for simplicity
                const priceId = subscription.items.data[0].price.id;

                if (priceId === process.env.STRIPE_PRICE_BASIC_AGENCY_PLAN) {
                    planName = 'Basic Agency Plan';
                    monthlyCredits = 100;
                } else if (priceId === process.env.STRIPE_PRICE_PRO_AGENCY_PLAN) {
                    planName = 'Pro Agency Plan';
                    monthlyCredits = 250;
                }
                renewalDate = new Date(subscription.current_period_end * 1000).toISOString();
            } catch (stripeError) {
                console.error('Error fetching Stripe subscription details:', stripeError);
                // Continue without subscription details if Stripe call fails
            }
        }
        
        // --- Client fetching logic (assuming clients are still managed via KV or another service for now) ---
        // For now, retaining KV logic for clients. In a fully PostgreSQL migration, this would change.
        const agency = await kv.get(`agency:${userId}`); // Temporarily fetch agency data from KV for client relation
        const clientIds = agency ? await kv.smembers(`agency:${userId}:clients`) : [];
        const clients = [];
        for (const clientId of clientIds) {
            const client = await kv.get(`user:${clientId}`);
            if(client) {
                const pages = await kv.smembers(`user:${clientId}:pages`);
                clients.push({ id: clientId, name: client.name, email: client.email, pagesGenerated: pages.length, credits: client.credits || 0 });
            }
        }

        const totalClients = clients.length;
        const totalPagesGenerated = clients.reduce((total, client) => total + client.pagesGenerated, 0);

        return res.status(200).json({
            agencyName: agencyUser.name, // Assuming 'name' column for agency name
            email: agencyUser.email,
            clients,
            logoUrl: agencyUser.logo_url,
            primaryColor: agencyUser.primary_color,
            credits: agencyUser.credits || 0,
            subscriptionStatus: agencyUser.subscription_status || 'inactive',
            planName: planName,
            monthlyCredits: monthlyCredits,
            renewalDate: renewalDate,
            totalClients,
            totalPagesGenerated,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = handler;
