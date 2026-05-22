import { kv } from '@vercel/kv';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js'; // Import PostgreSQL query utility
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Initialize Stripe
import { logError } from '../lib/logger.js';

async function handler(req, res, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET requests are allowed' });
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.authToken || cookies.token || cookies.auth;

    if (!token) {
        await logError(new Error('Authentication token missing.'), 'Agency Dashboard - Authentication Error', 'agency_dashboard_error.log');
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                await logError(error, 'Agency Dashboard - Token Expired', 'agency_dashboard_error.log');
                return res.status(401).json({ message: 'Authentication failed: Token expired.' });
            } else if (error.name === 'JsonWebTokenError') {
                await logError(error, 'Agency Dashboard - Invalid Token', 'agency_dashboard_error.log');
                return res.status(401).json({ message: 'Authentication failed: Invalid token.' });
            }
            await logError(error, 'Agency Dashboard - JWT Verification Error', 'agency_dashboard_error.log');
            return res.status(401).json({ message: 'Authentication failed: Please log in again.' });
        }
        
        const userId = decoded.agencyId; // agencyId is the userId

        if (!userId) {
            await logError(new Error('Agency ID missing after token decode.'), 'Agency Dashboard - Agency ID Missing', 'agency_dashboard_error.log');
            return res.status(403).json({ message: 'Not an agency account' });
        }

        // Fetch user (agency) data from PostgreSQL
        const userResult = await query(
            'SELECT id, name, email, credits, subscription_status, stripe_subscription_id, logo_url, primary_color FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            await logError(new Error(`Agency user not found for userId: ${userId}`), 'Agency Dashboard - User Not Found', 'agency_dashboard_error.log');
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
                await logError(stripeError, 'Agency Dashboard - Stripe Fetch Error', 'agency_dashboard_error.log');
                // Continue without subscription details if Stripe call fails
            }
        }
        
        // --- Client fetching logic (assuming clients are still managed via KV or another service for now) ---
        // For now, retaining KV logic for clients. In a fully PostgreSQL migration, this would change.
        const agency = await currentKv.get(`agency:${userId}`); // Temporarily fetch agency data from KV for client relation
        const clientIds = agency ? await currentKv.smembers(`agency:${userId}:clients`) : [];
        const clients = [];
        for (const clientId of clientIds) {
            const client = await currentKv.get(`user:${clientId}`);
            if(client) {
                const pages = await currentKv.smembers(`user:${clientId}:pages`);
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
        await logError(error, 'Agency Dashboard - General Error', 'agency_dashboard_error.log');
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default handler;
