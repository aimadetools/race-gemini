const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { buffer } = require('micro');

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const sig = req.headers['stripe-signature'];
        const buf = await buffer(req);

        let event;

        try {
            event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
        } catch (err) {
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;

            // TODO:
            // 1. Get user details from the session
            // 2. Save the purchase to the database
            // 3. Trigger the page generation
            // 4. Send the pages to the user's email
            console.log('Payment was successful for session:', session.id);
        }

        res.status(200).send({ received: true });
    } else {
        res.status(405).send('Method Not Allowed');
    }
};
