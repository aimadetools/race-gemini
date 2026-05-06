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
        const { creditPackId } = req.body; // Expect creditPackId to be sent from the frontend

        if (!creditPackId) {
            await logError(new Error('Missing creditPackId in request body.'), 'Checkout Validation');
            return res.status(400).json({ message: 'Missing creditPackId in request body.' });
        }
        
        // Define credit pack details matching USAGE_BASED_PRICING.md
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

        const cookies = parse(req.headers.cookie || '');
        const token = cookies.authToken; // Correct cookie name is authToken

        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        let userId;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId;
        } catch (error) {
            await logError(error, 'JWT Verification Failed');
            return res.status(401).json({ message: 'Invalid token' });
        }

        try {
            const session = await stripe.checkout.sessions.create({
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
            });

            res.writeHead(303, { Location: session.url });
            res.end();
        } catch (error) {
            await logError(error, 'Stripe Checkout Session Creation');
            res.status(500).json({ message: 'Error creating checkout session.', error: error.message });
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
};

