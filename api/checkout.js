const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const { priceId } = req.body;

        if (!priceId) {
            return res.status(400).json({ message: 'Missing priceId in request body.' });
        }

        // Basic validation for priceId format (e.g., price_123xyz)
        if (!/^price_[a-zA-Z0-9]+$/.test(priceId)) {
            return res.status(400).json({ message: 'Invalid priceId format.' });
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
                mode: 'payment',
                success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${req.headers.origin}/pricing.html`,
            });

            res.writeHead(303, { Location: session.url });
            res.end();
        } catch (error) {
            console.error('Stripe checkout session creation failed:', error);
            // In production, avoid sending detailed error messages to the client
            res.status(500).send('Failed to create checkout session.');
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
};
