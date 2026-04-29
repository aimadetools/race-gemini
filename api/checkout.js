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
        
        const paymentLinks = {
            '50': 'https://buy.stripe.com/9B628r0ukdhs7ge3JZeEo0g',
            '200': 'https://buy.stripe.com/cNi5kD6SIelwasq1BReEo0f',
            '1000': 'https://buy.stripe.com/8x214n7WMb9kfMK5S7eEo0e',
        };

        const paymentLink = paymentLinks[credits];

        if (paymentLink) {
            res.writeHead(303, { Location: paymentLink });
            res.end();
        } else {
            res.status(404).json({ message: 'Payment link not found for the selected product.' });
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
};

