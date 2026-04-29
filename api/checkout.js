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
        const { priceId, credits } = req.body; // Expect credits to be sent from the frontend

        if (!priceId || !credits) {
            await logError(new Error('Missing priceId or credits in request body.'), 'Checkout Validation');
            return res.status(400).json({ message: 'Missing priceId or credits in request body.' });
        }

        // Basic validation for priceId format
        if (!/^price_[a-zA-Z0-9]+$/.test(priceId)) {
            await logError(new Error('Invalid priceId format.'), 'Checkout Validation');
            return res.status(400).json({ message: 'Invalid priceId format.' });
        }

        // Authenticate user to get userId for metadata
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.authToken;

        if (!token) {
            await logError(new Error('Auth token missing.'), 'Checkout - Authentication');
            return res.status(401).json({ message: 'Authentication required. Please log in.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
        } catch (error) {
            await logError(error, 'Checkout - JWT Verification Error');
            return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
        }
        
        const metadata = { credits };
        if (decoded.agencyId) {
            metadata.agencyId = decoded.agencyId;
        } else {
            metadata.userId = decoded.userId;
        }

        // TODO: Refactor to use Stripe Payment Links.
        // This endpoint will be updated to redirect to a pre-created Payment Link URL.
        // The Payment Link will be selected based on the 'priceId' or 'credits' from the request body.
        // The actual Payment Links need to be created in the Stripe Dashboard and provided by a human.

        // Placeholder for the future Payment Link logic
        const paymentLinks = {
            // price_12345: 'https://buy.stripe.com/link1',
            // price_67890: 'https://buy.stripe.com/link2',
        };

        const paymentLink = paymentLinks[priceId];

        if (paymentLink) {
            res.writeHead(303, { Location: paymentLink });
            res.end();
        } else {
            res.status(404).json({ message: 'Payment link not found for the selected product.' });
        }
        /*
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card', 'apple_pay'],
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${req.headers.origin}/pricing.html`,
                metadata,
            });

            res.writeHead(303, { Location: session.url });
            res.end();
        } catch (error) {
            await logError(error, 'Stripe checkout session creation failed');
            res.status(500).send('Failed to create checkout session.');
        }
        */
    } else {
        res.status(405).send('Method Not Allowed');
    }
};

