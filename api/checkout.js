import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { logError } from '../lib/logger.js';


export default async (req, res) => {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.authToken || cookies.auth;
    let userId = null;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId;
        } catch (error) {
            console.error('Error verifying token:', error);
            await logError(error, 'Token Verification');
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }
    }

    if (!userId) {
        await logError(new Error('User not authenticated.'), 'Authentication Check');
        return res.status(401).json({ message: 'User not authenticated.' });
    }

    if (req.method === 'POST') {
        const { creditPackId, agencyPlanId, referrerId } = req.body; // Expect either creditPackId, agencyPlanId, and optionally referrerId
        let sessionConfig = {}; // Initialize a configuration object for the Stripe session
        
        const host = req.headers.host || 'localseogen.com';
        const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;

        // Add referrerId to metadata if present
        const metadata = {
            userId: userId // Explicitly pass userId
        };
        if (referrerId) {
            metadata.referrerId = referrerId;
        }

        if (creditPackId) {
            // Logic for one-time credit pack purchase
            const creditPackDetails = {
                'pack_small_business': { name: 'Small Business Pack (50 Credits)', credits: 50, amount: 4900 },    // $49.00
                'pack_pro': { name: 'Pro Pack (200 Credits)', credits: 200, amount: 9900 },  // $99.00
                'pack_agency': { name: 'Agency Pack (1000 Credits)', credits: 1000, amount: 24900 }, // $249.00
                'pack_wholesale_500': { name: 'Wholesale Credits 500 Pack', credits: 500, amount: 10000 }, // $100.00
                'pack_wholesale_1000': { name: 'Wholesale Credits 1000 Pack', credits: 1000, amount: 18000 }, // $180.00
                'pack_wholesale_5000': { name: 'Wholesale Credits 5000 Pack', credits: 5000, amount: 75000 }, // $750.00
            };

            let selectedPack;

            if (creditPackId === 'pack_custom') {
                const { customAmount, customCredits } = req.body;
                const parsedCustomAmount = parseInt(customAmount, 10);
                const parsedCustomCredits = parseInt(customCredits, 10);

                if (isNaN(parsedCustomAmount) || parsedCustomAmount <= 0 || isNaN(parsedCustomCredits) || parsedCustomCredits <= 0) {
                    await logError(new Error(`Invalid custom amount or credits provided: amount=${customAmount}, credits=${customCredits}`), 'Checkout Product Selection - Custom Pack Validation');
                    return res.status(400).json({ message: 'Invalid custom amount or credits for custom pack.' });
                }

                // Server-side validation of price to prevent price tampering
                const calculateExpectedPrice = (credits) => {
                    if (credits <= 50) {
                        return credits * 0.98;
                    } else if (credits <= 200) {
                        return 49 + (credits - 50) * (50 / 150);
                    } else if (credits <= 1000) {
                        return 99 + (credits - 200) * (150 / 800);
                    } else {
                        return 249 + (credits - 1000) * 0.249;
                    }
                };

                const expectedAmount = Math.round(calculateExpectedPrice(parsedCustomCredits) * 100);

                if (parsedCustomAmount !== expectedAmount) {
                    await logError(new Error(`Price tampering detected: amount=${parsedCustomAmount}, credits=${parsedCustomCredits}, expected=${expectedAmount}`), 'Checkout Product Selection - Custom Pack Price Mismatch');
                    return res.status(400).json({ message: 'Invalid custom amount or credits for custom pack.' });
                }

                selectedPack = {
                    name: `Custom Credit Pack (${parsedCustomCredits} Credits)`,
                    credits: parsedCustomCredits,
                    amount: parsedCustomAmount,
                };
            } else {
                selectedPack = creditPackDetails[creditPackId];
            }

            if (!selectedPack) {
                await logError(new Error(`Credit pack details not found for ${creditPackId}.`), 'Checkout Product Selection');
                return res.status(404).json({ message: 'Credit pack details not found for the selected ID.' });
            }

            sessionConfig = {
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: selectedPack.name,
                            },
                            unit_amount: selectedPack.amount,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${baseUrl}/pricing.html`, // Redirect back to pricing page
                client_reference_id: userId,
                metadata: {
                    ...metadata, // Spread existing metadata (including referrerId if present)
                    creditPackId: creditPackId, // Pass the pack ID
                    credits: selectedPack.credits, // Pass the actual credits
                },
            };
        } else if (agencyPlanId) {
            // Logic for agency subscription plan
            const agencyPlanDetails = {
                'plan_basic_agency': { name: 'Basic Agency Plan', priceId: process.env.STRIPE_PRICE_BASIC_AGENCY_PLAN },
                'plan_pro_agency': { name: 'Pro Agency Plan', priceId: process.env.STRIPE_PRICE_PRO_AGENCY_PLAN },
            };

            const selectedPlan = agencyPlanDetails[agencyPlanId];

            if (!selectedPlan) {
                await logError(new Error(`Agency plan details not found for ${agencyPlanId}.`), 'Checkout Agency Plan Selection');
                return res.status(404).json({ message: 'Agency plan details not found for the selected ID.' });
            }

            // Ensure the priceId is available in environment variables
            if (!selectedPlan.priceId) {
                await logError(new Error(`Stripe Price ID not configured for agency plan ${agencyPlanId}.`), 'Checkout Agency Plan Price ID Missing');
                return res.status(500).json({ message: `Stripe Price ID not configured for agency plan ${agencyPlanId}.` });
            }

            sessionConfig = {
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: selectedPlan.priceId,
                        quantity: 1,
                    },
                ],
                mode: 'subscription', // Use subscription mode for recurring payments
                success_url: `${baseUrl}/agency-subscription.html?session_id={CHECKOUT_SESSION_ID}`, // Redirect to agency success page
                cancel_url: `${baseUrl}/agency-partnerships.html`, // Redirect back to agency pricing page
                client_reference_id: userId,
                customer_creation: 'always', // Ensure a customer is created in Stripe
                metadata: {
                    ...metadata, // Spread existing metadata (including referrerId if present)
                    agencyPlanId: agencyPlanId,
                    agencyId: userId // Pass userId as agencyId for subscription metadata
                },
            };
        } else {
            await logError(new Error('Neither creditPackId nor agencyPlanId provided in request body.'), 'Checkout Validation');
            return res.status(400).json({ message: 'Missing creditPackId or agencyPlanId in request body.' });
        }

        try {
            const session = await stripe.checkout.sessions.create(sessionConfig);
            res.status(200).json({ sessionId: session.id });
        } catch (error) {
            await logError(error, 'Stripe Session Creation');
            res.status(500).json({ message: 'Failed to create Stripe checkout session.' });
        }
    } else {
        res.setHeader('Allow', 'POST');
        res.status(405).end('Method Not Allowed');
    }
};

