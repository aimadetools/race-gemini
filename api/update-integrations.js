import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { logError } from '../lib/logger.js';
import { query } from '../db/index.js';

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

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      await logError(error, 'JWT Verification Error', 'update_integrations.log');
      return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }

    const userId = decoded.userId;

    const { webhookUrl, webhookEnabled, gaTrackingId, fbPixelId, smsEnabled, smsPhone } = req.body;

    // Validate inputs
    let cleanWebhookUrl = webhookUrl ? webhookUrl.trim() : null;
    let isWebhookEnabled = !!webhookEnabled;
    let cleanGaTrackingId = gaTrackingId ? gaTrackingId.trim() : null;
    let cleanFbPixelId = fbPixelId ? fbPixelId.trim() : null;
    let cleanSmsPhone = smsPhone ? smsPhone.trim() : null;
    let isSmsEnabled = !!smsEnabled;

    if (isWebhookEnabled && cleanWebhookUrl) {
      try {
        const urlObj = new URL(cleanWebhookUrl);
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
          return res.status(400).json({ message: 'Webhook URL must use http or https protocol.' });
        }
      } catch (e) {
        return res.status(400).json({ message: 'Invalid Webhook URL format.' });
      }
    }

    if (isSmsEnabled) {
      if (!cleanSmsPhone) {
        return res.status(400).json({ message: 'Phone number is required when SMS alerts are enabled.' });
      }
      const phoneRegex = /^\+?[1-9]\d{1,14}$/; // Standard E.164 phone format check
      if (!phoneRegex.test(cleanSmsPhone.replace(/[\s\-\(\)]/g, ''))) {
        return res.status(400).json({ message: 'Invalid phone number format. Must include country code (e.g. +15551234567).' });
      }
    }

    // Limit length
    if (cleanWebhookUrl && cleanWebhookUrl.length > 500) {
      return res.status(400).json({ message: 'Webhook URL must be under 500 characters.' });
    }
    if (cleanGaTrackingId && cleanGaTrackingId.length > 100) {
      return res.status(400).json({ message: 'Google Analytics ID must be under 100 characters.' });
    }
    if (cleanFbPixelId && cleanFbPixelId.length > 100) {
      return res.status(400).json({ message: 'Facebook Pixel ID must be under 100 characters.' });
    }
    if (cleanSmsPhone && cleanSmsPhone.length > 50) {
      return res.status(400).json({ message: 'Phone number must be under 50 characters.' });
    }

    // Update in PostgreSQL
    await query(
      `UPDATE users 
       SET webhook_url = $1, 
           webhook_enabled = $2, 
           ga_tracking_id = $3, 
           fb_pixel_id = $4,
           sms_enabled = $5,
           sms_phone = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [cleanWebhookUrl, isWebhookEnabled, cleanGaTrackingId, cleanFbPixelId, isSmsEnabled, cleanSmsPhone, userId]
    );

    return res.status(200).json({ message: 'Integration settings updated successfully.' });

  } catch (error) {
    await logError(error, 'Update Integrations General Error', 'update_integrations.log');
    return res.status(500).json({ message: 'Internal Server Error. Could not update settings.' });
  }
}
