const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { buffer } = require('micro');
import { kv } from '@vercel/kv'; // Import kv
const fs = require('fs');
const path = require('path');
import { query } from '../db/index.js'; // Import PostgreSQL query utility

async function logError(error, context) {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFilePath = path.join(logDir, 'webhook_error.log'); // Separate log for webhook errors
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] Context: ${context}\nError: ${error.message}\nStack: ${error.stack}\n\n`;
  fs.appendFileSync(logFilePath, errorMessage);
}

module.exports = async (req, res, currentKvClient) => {
    const currentKv = currentKvClient || kv;
    if (req.method === 'POST') {
        const sig = req.headers['stripe-signature'];
        const buf = await buffer(req);

        let event;

        try {
            event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET || 'dummy_stripe_webhook_secret'); // Add fallback
        } catch (err) {
            await logError(err, 'Stripe Webhook Signature Verification Failed');
            return res.status(400).json({ message: 'Webhook Error: Signature verification failed.' });
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.client_reference_id;
            const credits = session.metadata.credits;

            if (!userId || !credits) {
                await logError(new Error('Missing userId (from client_reference_id) or credits in session.'), 'Stripe Webhook - Missing Data');
                return res.status(400).json({ message: 'Missing user identifier or credits in session.' });
            }

            try {
                // Update user credits in PostgreSQL
                const parsedCredits = parseInt(credits, 10);
                if (isNaN(parsedCredits)) {
                    await logError(new Error(`Invalid credits value received: ${credits}`), 'Stripe Webhook - Invalid Credits');
                    return res.status(400).json({ message: 'Invalid credits value received.' });
                }

                const result = await query(
                    'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
                    [parsedCredits, userId]
                );

                if (result.rows.length === 0) {
                    await logError(new Error(`User not found for userId: ${userId}`), 'Stripe Webhook - User Not Found in DB');
                    return res.status(404).json({ message: 'User not found in database.' });
                }

                console.log(`User ${userId} successfully purchased ${credits} credits. New balance: ${result.rows[0].credits}`);
            } catch (error) {
                await logError(error, 'Stripe Webhook - Credit Update Failed (PostgreSQL)');
                return res.status(500).json({ message: 'Error updating credits in database.' });
            }
        }

        if (event.type === 'invoice.payment_succeeded') {
            const invoice = event.data.object;
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const priceId = subscription.items.data[0].price.id;
            const agencyId = subscription.metadata.agencyId;

            if (agencyId) {
                let creditsToAdd = 0;
                if (priceId === 'price_BASIC_AGENCY_PLAN') {
                    creditsToAdd = 100;
                } else if (priceId === 'price_PRO_AGENCY_PLAN') {
                    creditsToAdd = 250;
                }

                if (creditsToAdd > 0) {
                    const agency = await currentKv.get(`agency:${agencyId}`);
                    if (agency) {
                        agency.credits = (agency.credits || 0) + creditsToAdd;
                        agency.subscriptionStatus = 'active';
                        await currentKv.set(`agency:${agencyId}`, agency);
                        console.log(`Added ${creditsToAdd} credits to agency ${agencyId}`);
                    }
                }
            }
        }

        if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const agencyId = subscription.metadata.agencyId;

            if (agencyId) {
                const agency = await currentKv.get(`agency:${agencyId}`);
                if (agency) {
                    agency.subscriptionStatus = 'canceled';
                    await currentKv.set(`agency:${agencyId}`, agency);
                    console.log(`Subscription for agency ${agencyId} canceled.`);
                }
            }
        }

        res.status(200).send({ received: true });
    } else {
        res.status(405).send('Method Not Allowed');
    }
};
