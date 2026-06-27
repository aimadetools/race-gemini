import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import { buffer } from 'micro';
import { kv } from '@vercel/kv';


import fs from 'fs';
import path from 'path';
import { query } from '../db/index.js'; // Import PostgreSQL query utility
import trackEventHandler from './track.js'; // Import the event tracking handler
import { logError, logInfo } from '../lib/logger.js';
import { sendEmail } from '../lib/email.js';

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

// New helper function to update referral status and commission in PostgreSQL
async function updateReferralStatusAndCommission(referrerId, referredUserId, amountTotal, sessionMode) {
    try {
        const commissionRate = parseFloat(process.env.REFERRAL_COMMISSION_RATE) || 0.35; // Default to 35% commission
        const earnedAmount = (amountTotal / 100) * commissionRate; // Convert cents to dollars and apply commission

        // Update the referral entry in the 'referrals' table
        const result = await query(
            `UPDATE referrals
             SET status = $1, commission_earned = $2, updated_at = NOW()
             WHERE referrer_id = (SELECT id FROM users WHERE referral_code = $3) AND referred_id = $4 RETURNING id`,
            ['purchased', earnedAmount, referrerId, referredUserId]
        );

        if (result.rows.length > 0) {
            await logInfo(`Referral ${result.rows[0].id} updated: referred user ${referredUserId} made a purchase. Referrer ${referrerId} earned $${earnedAmount.toFixed(2)}.`, 'Referral Logic');

            // Track referral conversion event
            await trackEventHandler({
                method: 'POST',
                body: {
                    eventName: 'referral_conversion',
                    userId: referredUserId, // The converted user's ID
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
        } else {
            await logInfo(`No matching referral found for referrer ${referrerId} and referred user ${referredUserId}. Status and commission not updated.`, 'Referral Logic');
        }
    } catch (error) {
        await logError(error, 'PostgreSQL Referral Update Error');
        // Do not block webhook processing if referral update fails
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

export default async (req, res) => { // Removed currentKvClient parameter
    await logInfo('Stripe webhook received.', 'Stripe Webhook');
    // const currentKv = currentKvClient || kv; // Removed: Vercel KV is no longer used for referral data
    if (req.method === 'POST') {
        const sig = req.headers['stripe-signature'];
        const buf = await buffer(req);

        let event;

        try {
            event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET || 'dummy_stripe_webhook_secret'); // Add fallback
            await logInfo(`Stripe event constructed: ${event.type}`, 'Stripe Webhook');
        } catch (err) {
            await logError(err, 'Stripe Webhook Signature Verification Failed');
            return res.status(400).json({ message: 'Webhook Error: Signature verification failed.' });
        }

        if (event.type === 'checkout.session.completed') {
            await logInfo('Processing checkout.session.completed event.', 'Stripe Webhook');
            const session = event.data.object;
            const userId = session.metadata.userId; // Get userId from metadata
            const referrerId = session.metadata.referrerId; // Get referrerId from metadata
            const amountTotal = session.amount_total; // Amount in cents

            if (!userId) {
                await logError(new Error('Missing userId in session metadata.'), 'Stripe Webhook - Missing Data (userId)');
                return res.status(400).json({ message: 'Missing user identifier in session metadata.' });
            }

            // --- Referral Logic Start ---
            // If the user was referred and referrerId is passed in metadata, update the referral status and commission
            if (referrerId) {
                await updateReferralStatusAndCommission(referrerId, userId, amountTotal, session.mode);
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
                            'UPDATE users SET credits = credits + $1, subscription_status = $2, stripe_subscription_id = $3, stripe_customer_id = $4, is_agency = true WHERE id = $5 RETURNING credits',
                            [creditsToAdd, 'active', session.subscription, session.customer, userId]
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
                        try {
                            await kv.lpush(`user:${userId}:credittransactions`, JSON.stringify(transaction));
                        } catch (kvErr) {
                            await logError(kvErr, 'Stripe Webhook - KV Subscription Transaction Log Error');
                        }


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

                        // Track purchase_completed event
                        await trackEventHandler({
                            method: 'POST',
                            body: {
                                eventName: 'purchase_completed',
                                userId: userId,
                                eventData: {
                                    type: 'subscription',
                                    planId: agencyPlanId,
                                    creditsAdded: creditsToAdd,
                                    stripePriceId: priceId,
                                    stripeSubscriptionId: session.subscription,
                                    amountTotal: amountTotal,
                                    revenue: amountTotal / 100
                                }
                            }
                        }, {
                            status: () => ({ json: () => {} })
                        });
                    } else {
                        await logError(new Error(`No credits defined for priceId: ${priceId} during subscription checkout.`), 'Stripe Webhook - No Credits Defined for Subscription');
                        return res.status(400).json({ message: 'No credits defined for subscription plan.' });
                    }

                } else if (session.mode === 'payment') {
                    const leadId = session.metadata.leadId;
                    const credits = session.metadata.credits; // This is for one-time credit packs

                    if (leadId) {
                        const parsedLeadId = parseInt(leadId, 10);
                        if (isNaN(parsedLeadId)) {
                            await logError(new Error(`Invalid leadId received in webhook: ${leadId}`), 'Stripe Webhook - Invalid Lead ID');
                            return res.status(400).json({ message: 'Invalid leadId received.' });
                        }

                        // Unlock the lead in the database
                        const leadResult = await query(
                            'SELECT user_id, name FROM leads WHERE id = $1',
                            [parsedLeadId]
                        );

                        console.log('--- Webhook Query parsedLeadId:', parsedLeadId);
                        console.log('--- Webhook Query result rows:', JSON.stringify(leadResult.rows));

                        if (leadResult.rows.length === 0) {
                            await logError(new Error(`Lead with ID ${parsedLeadId} not found in database.`), 'Stripe Webhook - Lead Not Found');
                            return res.status(404).json({ message: 'Lead not found.' });
                        }

                        const lead = leadResult.rows[0];

                        // Ensure lead belongs to the user
                        if (lead.user_id !== parseInt(userId, 10)) {
                            await logError(new Error(`Unauthorized lead unlock request. Lead owner: ${lead.user_id}, Payment user: ${userId}`), 'Stripe Webhook - Unauthorized Lead Unlock');
                            return res.status(403).json({ message: 'Unauthorized lead unlock.' });
                        }

                        await query(
                            'UPDATE leads SET is_unlocked = TRUE WHERE id = $1',
                            [parsedLeadId]
                        );

                        await logInfo(`Lead ${parsedLeadId} (${lead.name}) successfully unlocked via direct payment for user ${userId}.`, 'Single Lead Purchase');

                        // Send email notification to user
                        const userEmail = await getUserEmail(userId);
                        if (userEmail) {
                            const subject = 'Lead Unlocked Successfully!';
                            const html = `<p>You have successfully paid to unlock the lead <strong>${lead.name}</strong>. Go to your dashboard to view the lead's full contact details.</p>`;
                            await sendEmail(userEmail, subject, html);
                        }

                        // Track revenue event
                        await trackEventHandler({
                            method: 'POST',
                            body: {
                                eventName: 'revenue_generated',
                                userId: userId,
                                eventData: {
                                    type: 'single_lead',
                                    leadId: parsedLeadId,
                                    amountTotal: amountTotal
                                }
                            }
                        }, {
                            status: () => ({ json: () => {} })
                        });

                        // Track purchase_completed event
                        await trackEventHandler({
                            method: 'POST',
                            body: {
                                eventName: 'purchase_completed',
                                userId: userId,
                                eventData: {
                                    type: 'single_lead',
                                    leadId: parsedLeadId,
                                    amountTotal: amountTotal,
                                    revenue: amountTotal / 100
                                }
                            }
                        }, {
                            status: () => ({ json: () => {} })
                        });

                        await logInfo(`Stripe webhook event checkout.session.completed processed successfully for lead ${parsedLeadId}.`, 'Stripe Webhook');
                        return res.status(200).send({ received: true });
                    }

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
                        'UPDATE users SET credits = credits + $1, stripe_customer_id = $2 WHERE id = $3 RETURNING credits',
                        [parsedCredits, session.customer, userId]
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
                    try {
                        await kv.lpush(`user:${userId}:credittransactions`, JSON.stringify(transaction));
                    } catch (kvErr) {
                        await logError(kvErr, 'Stripe Webhook - KV Credit Pack Transaction Log Error');
                    }


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

                    // Track purchase_completed event
                    await trackEventHandler({
                        method: 'POST',
                        body: {
                            eventName: 'purchase_completed',
                            userId: userId,
                            eventData: {
                                type: 'credit_pack',
                                creditsPurchased: parsedCredits,
                                amountTotal: amountTotal,
                                revenue: amountTotal / 100
                            }
                        }
                    }, {
                        status: () => ({ json: () => {} })
                    });
                }
            } catch (error) {
                await logError(error, 'Stripe Webhook - Checkout Session Completed Processing Failed');
                return res.status(500).json({ message: 'Error processing checkout.session.completed event.' });
            }
        }

        if (event.type === 'invoice.payment_succeeded') {
            await logInfo('Processing invoice.payment_succeeded event.', 'Stripe Webhook');
            const invoice = event.data.object;
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const priceId = subscription.items.data[0].price.id;
            const userId = subscription.metadata.agencyId; // agencyId is the userId

            if (userId) {
                const creditsToAdd = getCreditsToAdd(priceId);
                if (creditsToAdd > 0) {
                    try {
                        const result = await query(
                            'UPDATE users SET credits = credits + $1, subscription_status = $2, stripe_customer_id = $3, is_agency = true WHERE id = $4 RETURNING credits',
                            [creditsToAdd, 'active', invoice.customer, userId]
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
            await logInfo('Processing customer.subscription.deleted event.', 'Stripe Webhook');
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

        await logInfo(`Stripe webhook event ${event.type} processed successfully.`, 'Stripe Webhook');
        res.status(200).send({ received: true });
    } else {
        res.status(405).send('Method Not Allowed');
    }
};
