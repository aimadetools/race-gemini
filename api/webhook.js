const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { buffer } = require('micro');
import { kv } from '@vercel/kv'; // Import kv
const fs = require('fs');
const path = require('path');
import { query } from '../db/index.js'; // Import PostgreSQL query utility
import trackEventHandler from './track.js'; // Import the event tracking handler

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
            
            if (!userId) {
                await logError(new Error('Missing userId (from client_reference_id) in session.'), 'Stripe Webhook - Missing Data (userId)');
                return res.status(400).json({ message: 'Missing user identifier in session.' });
            }

            try {
                if (session.mode === 'subscription') {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription);
                    const agencyPlanId = session.metadata.agencyPlanId; // This was set in checkout.js
                    const priceId = subscription.items.data[0].price.id;

                    let creditsToAdd = 0;
                    if (priceId === process.env.STRIPE_PRICE_BASIC_AGENCY_PLAN) {
                        creditsToAdd = 100;
                    } else if (priceId === process.env.STRIPE_PRICE_PRO_AGENCY_PLAN) {
                        creditsToAdd = 250;
                    }

                    if (creditsToAdd > 0) {
                        const result = await query(
                            'UPDATE users SET credits = credits + $1, subscription_status = $2, stripe_subscription_id = $3 WHERE id = $4 RETURNING credits',
                            [creditsToAdd, 'active', session.subscription, userId]
                        );

                        if (result.rows.length === 0) {
                            await logError(new Error(`User not found for userId: ${userId} during subscription checkout.`), 'Stripe Webhook - User Not Found for Subscription');
                            return res.status(404).json({ message: 'User not found in database for subscription.' });
                        }
                        console.log(`Agency user ${userId} subscribed to ${agencyPlanId}, added ${creditsToAdd} credits. New balance: ${result.rows[0].credits}`);
                        // Track revenue generated from subscription
                        await trackEventHandler({
                            method: 'POST',
                            body: {
                                eventName: 'revenue_generated',
                                userId: userId,
                                eventData: {
                                    type: 'subscription',
                                    planId: agencyPlanId,
                                    creditsAdded: creditsToAdd,
                                    stripePriceId: priceId,
                                    stripeSubscriptionId: session.subscription,
                                    amountTotal: session.amount_total // Use amount_total from session if available
                                }
                            }
                        }, {
                            status: () => ({ json: () => {} }) // Mock response for tracking
                        });
                    } else {
                        await logError(new Error(`No credits defined for priceId: ${priceId} during subscription checkout.`), 'Stripe Webhook - No Credits Defined for Subscription');
                        return res.status(400).json({ message: 'No credits defined for subscription plan.' });
                    }

                } else if (session.mode === 'payment') {
                    const credits = session.metadata.credits; // This is for one-time credit packs

                    if (!credits) {
                        await logError(new Error('Missing credits in session metadata for payment mode.'), 'Stripe Webhook - Missing Credits for Payment');
                        return res.status(400).json({ message: 'Missing credits in session metadata for payment.' });
                    }

                    const parsedCredits = parseInt(credits, 10);
                    if (isNaN(parsedCredits)) {
                        await logError(new Error(`Invalid credits value received for payment mode: ${credits}`), 'Stripe Webhook - Invalid Credits for Payment');
                        return res.status(400).json({ message: 'Invalid credits value received for payment mode.' });
                    }

                    const result = await query(
                        'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
                        [parsedCredits, userId]
                    );

                    if (result.rows.length === 0) {
                        await logError(new Error(`User not found for userId: ${userId} during credit pack purchase.`), 'Stripe Webhook - User Not Found for Credit Pack');
                        return res.status(404).json({ message: 'User not found in database for credit pack purchase.' });
                    }
                    console.log(`User ${userId} successfully purchased ${credits} credits. New balance: ${result.rows[0].credits}`);
                    // Track revenue generated from one-time credit pack purchase
                    await trackEventHandler({
                        method: 'POST',
                        body: {
                            eventName: 'revenue_generated',
                            userId: userId,
                            eventData: {
                                type: 'credit_pack',
                                creditsPurchased: parsedCredits,
                                amountTotal: session.amount_total // Use amount_total from session if available
                            }
                        }
                    }, {
                        status: () => ({ json: () => {} }) // Mock response for tracking
                    });
                }
            } catch (error) {
                await logError(error, 'Stripe Webhook - Checkout Session Completed Processing Failed');
                return res.status(500).json({ message: 'Error processing checkout.session.completed event.' });
            }
        }

        if (event.type === 'invoice.payment_succeeded') {
            const invoice = event.data.object;
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const priceId = subscription.items.data[0].price.id;
            const userId = subscription.metadata.agencyId; // agencyId is the userId

            if (userId) {
                let creditsToAdd = 0;
                if (priceId === process.env.STRIPE_PRICE_BASIC_AGENCY_PLAN) {
                    creditsToAdd = 100;
                } else if (priceId === process.env.STRIPE_PRICE_PRO_AGENCY_PLAN) {
                    creditsToAdd = 250;
                }

                if (creditsToAdd > 0) {
                    try {
                        const result = await query(
                            'UPDATE users SET credits = credits + $1, subscription_status = $2 WHERE id = $3 RETURNING credits',
                            [creditsToAdd, 'active', userId]
                        );

                        if (result.rows.length === 0) {
                            await logError(new Error(`User not found for userId: ${userId} during invoice payment succeeded.`), 'Stripe Webhook - User Not Found for Invoice');
                            return res.status(404).json({ message: 'User not found in database for invoice payment.' });
                        }
                        console.log(`Added ${creditsToAdd} credits to agency user ${userId} on invoice payment. New balance: ${result.rows[0].credits}`);
                        // Track revenue generated from recurring invoice payment
                        await trackEventHandler({
                            method: 'POST',
                            body: {
                                eventName: 'revenue_generated',
                                userId: userId,
                                eventData: {
                                    type: 'invoice_payment',
                                    creditsAdded: creditsToAdd,
                                    stripePriceId: priceId,
                                    stripeSubscriptionId: invoice.subscription,
                                    amountTotal: invoice.amount_due // Use amount_due from invoice
                                }
                            }
                        }, {
                            status: () => ({ json: () => {} }) // Mock response for tracking
                        });
                    } catch (error) {
                        await logError(error, 'Stripe Webhook - Invoice Payment Succeeded Processing Failed (PostgreSQL)');
                        return res.status(500).json({ message: 'Error processing invoice.payment_succeeded event.' });
                    }
                }
            } else {
                await logError(new Error('Missing userId (agencyId) in subscription metadata for invoice payment succeeded.'), 'Stripe Webhook - Missing userId for Invoice');
                return res.status(400).json({ message: 'Missing user identifier in subscription metadata for invoice payment.' });
            }
        }

        if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const userId = subscription.metadata.agencyId; // agencyId is the userId

            if (userId) {
                try {
                    const result = await query(
                        'UPDATE users SET subscription_status = $1 WHERE id = $2 RETURNING id',
                        ['canceled', userId]
                    );

                    if (result.rows.length === 0) {
                        await logError(new Error(`User not found for userId: ${userId} during subscription deletion.`), 'Stripe Webhook - User Not Found for Subscription Deletion');
                        return res.status(404).json({ message: 'User not found in database for subscription deletion.' });
                    }
                    console.log(`Subscription for agency user ${userId} canceled in PostgreSQL.`);
                } catch (error) {
                    await logError(error, 'Stripe Webhook - Subscription Deletion Processing Failed (PostgreSQL)');
                    return res.status(500).json({ message: 'Error processing customer.subscription.deleted event.' });
                }
            } else {
                await logError(new Error('Missing userId (agencyId) in subscription metadata for subscription deletion.'), 'Stripe Webhook - Missing userId for Subscription Deletion');
                return res.status(400).json({ message: 'Missing user identifier in subscription metadata for subscription deletion.' });
            }
        }

        res.status(200).send({ received: true });
    } else {
        res.status(405).send('Method Not Allowed');
    }
};
