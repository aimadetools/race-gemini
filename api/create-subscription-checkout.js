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
  const logFilePath = path.join(logDir, 'subscription_checkout_error.log');
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] Context: ${context}
Error: ${error.message}
Stack: ${error.stack}

`;
  fs.appendFileSync(logFilePath, errorMessage);
}

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const { priceId } = req.body;

        if (!priceId) {
            await logError(new Error('Missing priceId in request body.'), 'Subscription Checkout Validation');
            return res.status(400).json({ message: 'Missing priceId in request body.' });
        }

        const cookies = parse(req.headers.cookie || '');
        const token = cookies.token;

        if (!token) {
            await logError(new Error('Auth token missing.'), 'Subscription Checkout - Authentication');
            return res.status(401).json({ message: 'Authentication required. Please log in.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            await logError(error, 'Subscription Checkout - JWT Verification Error');
            return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
        }

        const agencyId = decoded.agencyId;
        if (!agencyId) {
            return res.status(403).json({ message: 'Only agency accounts can subscribe.' });
        }

        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: `${req.headers.origin}/agency-dashboard.html?subscription=success`,
                cancel_url: `${req.headers.origin}/agency-billing.html`,
                metadata: {
                    agencyId: agencyId,
                    priceId: priceId
                },
            });

            res.writeHead(303, { Location: session.url });
            res.end();
        } catch (error) {
            await logError(error, 'Stripe subscription session creation failed');
            res.status(500).send('Failed to create subscription session.');
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
};
