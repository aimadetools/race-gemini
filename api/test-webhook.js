import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { logError } from '../lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.authToken;

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }

    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ message: 'Missing Webhook URL.' });
    }

    try {
      const urlObj = new URL(webhookUrl);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return res.status(400).json({ message: 'Webhook URL must use http or https protocol.' });
      }
    } catch (e) {
      return res.status(400).json({ message: 'Invalid Webhook URL format.' });
    }

    const testPayload = {
      event: 'test',
      message: 'Hello from LocalLeads! Your webhook is working correctly.',
      timestamp: new Date().toISOString(),
      sampleLead: {
        id: 9999,
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-0199',
        message: 'Test lead message from LocalLeads webhook setup',
        url: 'https://www.localseogen.com/sample-page.html',
        source: 'landing_page',
        createdAt: new Date().toISOString(),
        metadata: {
          businessName: 'Example Plumbers Ltd',
          service: 'Plumbing Service',
          town: 'Springfield'
        }
      }
    };

    let response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LocalLeads-Webhook/1.0'
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
    } catch (fetchErr) {
      return res.status(400).json({
        message: `Connection failed: Could not connect to Webhook URL. Details: ${fetchErr.message}`
      });
    }

    if (response.ok) {
      return res.status(200).json({
        message: `Webhook triggered successfully! Server returned status: ${response.status} ${response.statusText}`
      });
    } else {
      let bodyText = '';
      try {
        bodyText = await response.text();
        bodyText = bodyText.substring(0, 100); // limit error preview size
      } catch (_) {}

      return res.status(400).json({
        message: `Webhook failed: Server returned status ${response.status} ${response.statusText}. Response: ${bodyText || '(empty)'}`
      });
    }

  } catch (error) {
    await logError(error, 'Test Webhook General Error', 'test_webhook.log');
    return res.status(500).json({ message: 'Internal Server Error. Could not run webhook test.' });
  }
}
