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

    const { webhookUrl, webhookEnabled, gaTrackingId, fbPixelId, smsEnabled, smsPhone, googleReviewLink, facebookReviewLink, yelpReviewLink, googleVerificationCode, weeklyReportEnabled, reportFrequency, autoResponderEnabled, autoResponderSubject, autoResponderMessage } = req.body;
    let isWeeklyReportEnabled = weeklyReportEnabled !== false;
    let isAutoResponderEnabled = !!autoResponderEnabled;
    let cleanAutoResponderSubject = autoResponderSubject ? autoResponderSubject.trim() : null;
    let cleanAutoResponderMessage = autoResponderMessage ? autoResponderMessage.trim() : null;
    let cleanReportFrequency = reportFrequency ? reportFrequency.trim().toLowerCase() : 'weekly';
    if (!['daily', 'weekly', 'monthly'].includes(cleanReportFrequency)) {
      cleanReportFrequency = 'weekly';
    }

    // Validate inputs
    let cleanWebhookUrl = webhookUrl ? webhookUrl.trim() : null;
    let isWebhookEnabled = !!webhookEnabled;
    let cleanGaTrackingId = gaTrackingId ? gaTrackingId.trim() : null;
    let cleanFbPixelId = fbPixelId ? fbPixelId.trim() : null;
    let cleanSmsPhone = smsPhone ? smsPhone.trim() : null;
    let isSmsEnabled = !!smsEnabled;
    let cleanGoogleReviewLink = googleReviewLink ? googleReviewLink.trim() : null;
    let cleanFacebookReviewLink = facebookReviewLink ? facebookReviewLink.trim() : null;
    let cleanYelpReviewLink = yelpReviewLink ? yelpReviewLink.trim() : null;
    let cleanGoogleVerificationCode = googleVerificationCode ? googleVerificationCode.trim() : null;

    if (cleanGoogleVerificationCode) {
      // Normalize: if it doesn't end in .html, and it starts with google, append .html
      // Or if it's just alphanumeric code, format it as google<code>.html if it looks like a verification code
      if (!cleanGoogleVerificationCode.endsWith('.html')) {
        if (!cleanGoogleVerificationCode.toLowerCase().startsWith('google')) {
          cleanGoogleVerificationCode = 'google' + cleanGoogleVerificationCode + '.html';
        } else {
          cleanGoogleVerificationCode = cleanGoogleVerificationCode + '.html';
        }
      }
      
      const verificationRegex = /^google[a-zA-Z0-9]+\.html$/;
      if (!verificationRegex.test(cleanGoogleVerificationCode)) {
        return res.status(400).json({ message: 'Invalid Google GSC Verification File format. Should match google[a-zA-Z0-9].html' });
      }
    }

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

    const validateReviewUrl = (url, name) => {
      if (url) {
        try {
          const urlObj = new URL(url);
          if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return `${name} must use http or https protocol.`;
          }
        } catch (e) {
          return `Invalid ${name} format.`;
        }
      }
      return null;
    };

    const googleErr = validateReviewUrl(cleanGoogleReviewLink, 'Google Review Link');
    if (googleErr) return res.status(400).json({ message: googleErr });

    const facebookErr = validateReviewUrl(cleanFacebookReviewLink, 'Facebook Review Link');
    if (facebookErr) return res.status(400).json({ message: facebookErr });

    const yelpErr = validateReviewUrl(cleanYelpReviewLink, 'Yelp Review Link');
    if (yelpErr) return res.status(400).json({ message: yelpErr });

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
    if (cleanGoogleReviewLink && cleanGoogleReviewLink.length > 500) {
      return res.status(400).json({ message: 'Google Review Link must be under 500 characters.' });
    }
    if (cleanFacebookReviewLink && cleanFacebookReviewLink.length > 500) {
      return res.status(400).json({ message: 'Facebook Review Link must be under 500 characters.' });
    }
    if (cleanYelpReviewLink && cleanYelpReviewLink.length > 500) {
      return res.status(400).json({ message: 'Yelp Review Link must be under 500 characters.' });
    }
    if (cleanGoogleVerificationCode && cleanGoogleVerificationCode.length > 100) {
      return res.status(400).json({ message: 'Google GSC Verification File name must be under 100 characters.' });
    }
    if (cleanAutoResponderSubject && cleanAutoResponderSubject.length > 255) {
      return res.status(400).json({ message: 'Auto-responder subject must be under 255 characters.' });
    }
    if (cleanAutoResponderMessage && cleanAutoResponderMessage.length > 2000) {
      return res.status(400).json({ message: 'Auto-responder message must be under 2000 characters.' });
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
           google_review_link = $7,
           facebook_review_link = $8,
           yelp_review_link = $9,
           google_verification_code = $10,
           weekly_report_enabled = $11,
           auto_responder_enabled = $12,
           auto_responder_subject = $13,
           auto_responder_message = $14,
           report_frequency = $15,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $16`,
      [cleanWebhookUrl, isWebhookEnabled, cleanGaTrackingId, cleanFbPixelId, isSmsEnabled, cleanSmsPhone, cleanGoogleReviewLink, cleanFacebookReviewLink, cleanYelpReviewLink, cleanGoogleVerificationCode, isWeeklyReportEnabled, isAutoResponderEnabled, cleanAutoResponderSubject, cleanAutoResponderMessage, cleanReportFrequency, userId]
    );


    return res.status(200).json({ message: 'Integration settings updated successfully.' });

  } catch (error) {
    await logError(error, 'Update Integrations General Error', 'update_integrations.log');
    return res.status(500).json({ message: 'Internal Server Error. Could not update settings.' });
  }
}
