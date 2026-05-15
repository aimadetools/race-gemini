const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { buffer } = require('micro');
import { kv } from '@vercel/kv'; // Import kv
const fs = require('fs');
const path = require('path');
import { query } from '../db/index.js'; // Import PostgreSQL query utility
import trackEventHandler from './track.js'; // Import the event tracking handler
import { logError } from '../../lib/logger';
import { sendEmail } from '../../lib/email';

// Helper function to determine credits based on price ID
function getCreditsToAdd(priceId) {
    let creditsToAdd = 0;
    if (priceId === process.env.STRIPE_PRICE_BASIC_AGENCY_PLAN) {
        creditsToAdd = 100;
    } else if (priceId === process.env.STRIPE_PRICE_PRO_AGENCY_PLAN) {
        creditsToAdd = 250;
    }
    return creditsToAdd;
}

// Helper function to update referrer data in Vercel KV
async function updateReferrerData(referrerId, userId, amountTotal, sessionMode, currentKv) {
    try {
        const referrerDataKey = `user:${referrerId}:referral_data`;
        let referrerData = await currentKv.get(referrerDataKey);

        // Initialize referrer data if it doesn't exist (should ideally exist from signup)
        if (!referrerData) {
            referrerData = {
                referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/referral-signup?ref=${referrerId}`,
                totalReferrals: 0,
                convertedReferrals: 0,
                earnedRewards: 0.00,
                recentReferrals: [],
            };
        } else {
            referrerData = JSON.parse(referrerData);
        }

        // Update convertedReferrals
        referrerData.convertedReferrals = (referrerData.convertedReferrals || 0) + 1;

        // Calculate earned rewards (20% commission)
        const commissionRate = 0.20;
        const earnedAmount = (amountTotal / 100) * commissionRate; // Convert cents to dollars and apply commission
        referrerData.earnedRewards = (referrerData.earnedRewards || 0.00) + earnedAmount;

        // Update status and reward for the referred user in recentReferrals
        const referredUserIndex = referrerData.recentReferrals.findIndex(
            (ref) => ref.id === userId
        );
        if (referredUserIndex !== -1) {
            referrerData.recentReferrals[referredUserIndex].status = 'Converted';
            referrerData.recentReferrals[referredUserIndex].reward = earnedAmount;
        } else {
            // If for some reason the referred user wasn't in recentReferrals (e.g., direct purchase without prior signup tracking), add them
            // This case should be rare if signup tracking is working correctly.
            referrerData.recentReferrals.push({
                id: userId,
                userEmail: `user_${userId}@unknown.com`, // Placeholder email if not tracked during signup
                status: 'Converted',
                date: new Date().toISOString(),
                reward: earnedAmount,
            });
        }

        // Save updated referrer data back to Vercel KV
        await currentKv.set(referrerDataKey, JSON.stringify(referrerData));
        await logInfo(`Referrer ${referrerId} data updated in Vercel KV with conversion.`, 'Referral Logic');
        
        // Track referral conversion event
        await trackEventHandler({
            method: 'POST',
            body: {
                eventName: 'referral_conversion',
                userId: userId, // The converted user's ID
                eventData: {
                    referrerId: referrerId,
                    convertedAmount: amountTotal,
                    earnedReward: earnedAmount,
                    checkoutMode: sessionMode
                }
            }
        }, {
            status: () => ({ json: () => {} }) // Mock response for tracking
        });

    } catch (kvError) {
        await logError(kvError, 'Vercel KV Update Error for Referrer Conversion');
        // Do not block webhook processing if KV update fails
    }
}

// Helper function to get user email from the database
async function getUserEmail(userId) {
    try {
        const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length > 0) {
            return userResult.rows[0].email;
        }
        return null;
    } catch (error) {
        await logError(error, `Failed to fetch email for userId: ${userId}`);
        return null;
    }
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
            const amountTotal = session.amount_total; // Amount in cents

            if (!userId) {
                await logError(new Error('Missing userId (from client_reference_id) in session.'), 'Stripe Webhook - Missing Data (userId)');
                return res.status(400).json({ message: 'Missing user identifier in session.' });
            }

            // --- Referral Logic Start ---
            // Fetch the purchasing user's referrerId from PostgreSQL
            const userResult = await query('SELECT referrer_id FROM users WHERE id = $1', [userId]);
            const referrerId = userResult.rows.length > 0 ? userResult.rows[0].referrer_id : null;

            // If the user was referred, update the referrer's data
            if (referrerId) {
                await updateReferrerData(referrerId, userId, amountTotal, session.mode, currentKv);
            }
            // --- Referral Logic End ---

            try {
                if (session.mode === 'subscription') {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription);
                    const agencyPlanId = session.metadata.agencyPlanId; // This was set in checkout.js
                    const priceId = subscription.items.data[0].price.id;

                    const creditsToAdd = getCreditsToAdd(priceId);
                    if (creditsToAdd > 0) {
                        const result = await query(
                            'UPDATE users SET credits = credits + $1, subscription_status = $2, stripe_subscription_id = $3 WHERE id = $4 RETURNING credits',
                            [creditsToAdd, 'active', session.subscription, userId]
                        );

                        if (result.rows.length === 0) {
                            await logError(new Error(`User not found for userId: ${userId} during subscription checkout.`), 'Stripe Webhook - User Not Found for Subscription');
                            return res.status(404).json({ message: 'User not found in database for subscription.' });
                        }
                        // Log credit transaction
                        const transaction = {
                            date: new Date().toISOString(),
                            description: `Subscription renewal (${agencyPlanId})`,
                            amount: creditsToAdd
                        };
                        await currentKv.lpush(`user:${userId}:credittransactions`, JSON.stringify(transaction));
                        await logInfo(`Agency user ${userId} subscribed to ${agencyPlanId}, added ${creditsToAdd} credits. New balance: ${result.rows[0].credits}`, 'Subscription');


                        // Send email notification
                        const userEmail = await getUserEmail(userId);
                        if (userEmail) {
                            const subject = 'Your Subscription is Active!';
                            const html = `<p>You have successfully subscribed and received ${creditsToAdd} credits. Your new balance is ${result.rows[0].credits}.</p>`;
                            await sendEmail(userEmail, subject, html);
                        }


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
                                    amountTotal: amountTotal // Use amount_total from session if available
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
                    // Log credit transaction
                    const transaction = {
                        date: new Date().toISOString(),
                        description: `Purchased ${parsedCredits} credits`,
                        amount: parsedCredits
                    };
                    await currentKv.lpush(`user:${userId}:credittransactions`, JSON.stringify(transaction));
                    await logInfo(`User ${userId} successfully purchased ${credits} credits. New balance: ${result.rows[0].credits}`, 'Credit Purchase');

                    // Send email notification
                    const userEmail = await getUserEmail(userId);
                    if (userEmail) {
                        const subject = 'Your Credit Purchase was Successful!';
                        const html = `<p>You have successfully purchased ${parsedCredits} credits. Your new balance is ${result.rows[0].credits}.</p>`;
                        await sendEmail(userEmail, subject, html);
                    }


                    // Track revenue generated from one-time credit pack purchase
                    await trackEventHandler({
                        method: 'POST',
                        body: {
                            eventName: 'revenue_generated',
                            userId: userId,
                            eventData: {
                                type: 'credit_pack',
                                creditsPurchased: parsedCredits,
                                amountTotal: amountTotal // Use amount_total from session if available
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
                const creditsToAdd = getCreditsToAdd(priceId);
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
                        // Log credit transaction
                        const transaction = {
                            date: new Date().toISOString(),
                            description: `Subscription renewal`,
                            amount: creditsToAdd
                        };
                        await currentKv.lpush(`user:${userId}:credittransactions`, JSON.stringify(transaction));
                        await logInfo(`Added ${creditsToAdd} credits to agency user ${userId} on invoice payment. New balance: ${result.rows[0].credits}`, 'Invoice Payment');

                        // Send email notification
                        const userEmail = await getUserEmail(userId);
                        if (userEmail) {
                            const subject = 'Your Subscription has Renewed!';
                            const html = `<p>Your subscription has renewed, and you have received ${creditsToAdd} credits. Your new balance is ${result.rows[0].credits}.</p>`;
                            await sendEmail(userEmail, subject, html);
                        }


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
                    await logInfo(`Subscription for agency user ${userId} canceled in PostgreSQL.`, 'Subscription Cancellation');
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
