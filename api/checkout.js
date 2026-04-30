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
        const { credits } = req.body; // Expect credits to be sent from the frontend

        if (!credits) {
            await logError(new Error('Missing credits in request body.'), 'Checkout Validation');
            return res.status(400).json({ message: 'Missing credits in request body.' });
        }
        
        const productDetails = {
            '50': { name: '50 Page Credits', amount: 500 },    // $5.00
            '200': { name: '200 Page Credits', amount: 1500 },  // $15.00
            '1000': { name: '1000 Page Credits', amount: 5000 }, // $50.00
        };

        const selectedProduct = productDetails[credits];

        if (!selectedProduct) {
            await logError(new Error(`Payment details not found for ${credits} credits.`), 'Checkout Product Selection');
            return res.status(404).json({ message: 'Payment details not found for the selected credits.' });
        }

        const cookies = parse(req.headers.cookie || '');
        const token = cookies.auth_token;

        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        let userId;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId;
        } catch (error) {
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
                                name: selectedProduct.name,
                            },
                            unit_amount: selectedProduct.amount,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `https://${req.headers.host}/success.html?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `https://${req.headers.host}/buy-credits.html`,
                client_reference_id: userId,
                metadata: {
                    credits: credits,
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

