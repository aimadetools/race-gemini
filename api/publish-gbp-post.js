import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { getValidAccessToken } from '../lib/gbp-helper.js';
import { logError } from '../lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const cookies = parse(req.headers.cookie || '');
  let token = cookies.authToken || cookies.auth;

  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated. Please log in.' });
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret_key_for_testing');
    userId = decoded.userId;
    if (!userId) {
      return res.status(400).json({ message: 'Invalid token payload' });
    }
  } catch (error) {
    await logError(error, 'GBP Publish Post - Token Verification Failed');
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  const { text } = req.body;
  if (!text || text.trim() === '') {
    return res.status(400).json({ message: 'Post content text is required.' });
  }

  try {
    // Fetch user details
    const userResult = await query(
      'SELECT gbp_oauth_refresh_token, gbp_oauth_access_token, gbp_oauth_token_expires_at, gbp_account_id, gbp_location_id, custom_domain, business_profile FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = userResult.rows[0];

    const isConnected = !!(user.gbp_oauth_refresh_token && user.gbp_oauth_access_token);
    if (!isConnected) {
      return res.status(400).json({ message: 'Google Business Profile is not connected. Please connect it in settings.' });
    }

    // Resolve domain/website URL for Call-to-Action link
    let ctaUrl = process.env.DOMAIN_URL || `https://localseogen.com`;
    if (user.custom_domain) {
      ctaUrl = `https://${user.custom_domain}`;
    } else if (user.business_profile) {
      try {
        const bp = typeof user.business_profile === 'string' ? JSON.parse(user.business_profile) : user.business_profile;
        if (bp && bp.website) {
          ctaUrl = bp.website;
        }
      } catch (e) {}
    }

    // Get a valid access token
    let accessToken;
    try {
      accessToken = await getValidAccessToken(userId, user);
    } catch (tokenErr) {
      await logError(tokenErr, 'GBP Publish Post - Failed to get valid access token');
      return res.status(401).json({ message: 'Google authentication expired or invalid. Please reconnect your account.' });
    }

    // Check if mock mode or real API
    if (accessToken === 'mock-access-token' || accessToken === 'mock-refreshed-access-token' || accessToken.startsWith('mock_')) {
      // Simulate successful post
      return res.status(200).json({
        message: 'Update successfully published to your Google Business Profile listing!',
        mock: true,
        post: {
          summary: text,
          ctaUrl
        }
      });
    }

    // Send post request to Google My Business API
    const accountId = user.gbp_account_id || 'mock-account-id';
    const locationId = user.gbp_location_id || 'mock-location-id';
    const googleApiUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;

    const response = await fetch(googleApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        languageCode: 'en-US',
        summary: text,
        callToAction: {
          actionType: 'LEARN_MORE',
          url: ctaUrl
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API responded with ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();

    // Log user event for audit/tracking purposes
    try {
      await query(
        'INSERT INTO user_events (user_id, event_name, event_data, created_at) VALUES ($1, $2, $3, NOW())',
        [userId, 'gbp_post_published', JSON.stringify({ length: text.length, gbp_post_id: responseData.name || null })]
      );
    } catch (eventErr) {
      console.error('Failed to log event for GBP post publish:', eventErr);
    }

    return res.status(200).json({
      message: 'Update successfully published to your Google Business Profile listing!',
      postId: responseData.name || null
    });

  } catch (error) {
    await logError(error, 'Google Business Profile Publish Post Error', 'gbp_publish_error.log');
    return res.status(500).json({ message: 'Failed to publish post to Google Business Profile.' });
  }
}
