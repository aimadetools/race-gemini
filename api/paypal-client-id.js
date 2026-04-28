import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // In a real application, you would fetch this from a secure configuration
      // or environment variable. For now, we'll use a placeholder or dummy value.
      const paypalClientId = process.env.PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID';

      if (paypalClientId === 'YOUR_PAYPAL_CLIENT_ID') {
        // Log an error if the client ID is not configured
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        const logFilePath = path.join(logDir, 'paypal_error.log');
        const timestamp = new Date().toISOString();
        const errorMessage = `[${timestamp}] PayPal Client ID not configured. Using placeholder.

`;
        fs.appendFileSync(logFilePath, errorMessage);

        console.warn('PayPal Client ID is not configured. Using placeholder.');
      }

      return res.status(200).json({ clientId: paypalClientId });
    } catch (error) {
      console.error('Error fetching PayPal client ID:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
