const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

async function logError(error, context) {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFilePath = path.join(logDir, 'checkout_error.log'); // Separate log for checkout errors
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] Context: ${context}\nError: ${error.message}\nStack: ${error.stack}\n\n`;
  fs.appendFileSync(logFilePath, errorMessage);
}

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const { creditPackId, agencyPlanId } = req.body; // Expect either creditPackId or agencyPlanId
        let sessionConfig = {}; // Initialize a configuration object for the Stripe session

        if (creditPackId) {
            // Logic for one-time credit pack purchase
            const creditPackDetails = {
                'pack_small_business': { name: 'Small Business Pack (50 Credits)', credits: 50, amount: 5000 },    // $50.00
                'pack_pro': { name: 'Pro Pack (200 Credits)', credits: 200, amount: 18000 },  // $180.00
                'pack_agency': { name: 'Agency Pack (1000 Credits)', credits: 1000, amount: 80000 }, // $800.00
            };

            const selectedPack = creditPackDetails[creditPackId];

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
                success_url: `https://${req.headers.host}/success.html?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `https://${req.headers.host}/pricing.html`, // Redirect back to pricing page
                client_reference_id: userId,
                metadata: {
                    creditPackId: creditPackId, // Pass the pack ID
                    credits: selectedPack.credits, // Pass the actual credits
                    userId: userId // Explicitly pass userId
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
                success_url: `https://${req.headers.host}/agency-subscription.html?session_id={CHECKOUT_SESSION_ID}`, // Redirect to agency success page
                cancel_url: `https://${req.headers.host}/agency-partnerships.html`, // Redirect back to agency pricing page
                client_reference_id: userId,
                customer_creation: 'always', // Ensure a customer is created in Stripe
                metadata: {
                    agencyPlanId: agencyPlanId,
                    userId: userId, // Explicitly pass userId
                    agencyId: userId // Pass userId as agencyId for subscription metadata
                },
            };
        } else {
            await logError(new Error('Neither creditPackId nor agencyPlanId provided in request body.'), 'Checkout Validation');
            return res.status(400).json({ message: 'Missing creditPackId or agencyPlanId in request body.' });
        }

        try {
            const session = await stripe.checkout.sessions.create(sessionConfig);
    } else {
        res.status(405).send('Method Not Allowed');
    }
};

