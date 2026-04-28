const paypal = require('@paypal/checkout-server-sdk');

// Creating an environment
let clientId = process.env.PAYPAL_CLIENT_ID;
let clientSecret = process.env.PAYPAL_CLIENT_SECRET;

// This sample uses SandboxEnvironment. In production, use LiveEnvironment.
let environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
let client = new paypal.core.PayPalHttpClient(environment);

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const { purchase_units } = req.body;
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: purchase_units
        });

        try {
            const order = await client.execute(request);
            res.status(200).json({ orderID: order.result.id });
        } catch (err) {
            res.status(500).send(err.message);
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
};
