import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';
import { getValidAccessToken } from '../lib/gbp-helper.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const cookies = cookie.parse(req.headers.cookie || '');
  let token = cookies.authToken || cookies.token || cookies.auth;

  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId || decoded.agencyId;
    if (!userId) {
      return res.status(400).json({ message: 'Invalid token payload' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const { id, replyText } = req.body;
  if (!id) {
    return res.status(400).json({ message: 'Testimonial ID is required.' });
  }

  if (replyText === undefined || replyText === null) {
    return res.status(400).json({ message: 'Reply text is required.' });
  }

  try {
    // 1. Fetch testimonial and verify ownership
    const testimonialResult = await query(
      'SELECT id, google_review_id FROM testimonials WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (testimonialResult.rows.length === 0) {
      return res.status(404).json({ message: 'Testimonial not found or unauthorized.' });
    }

    const testimonial = testimonialResult.rows[0];

    // 2. Save reply locally in database
    await query(
      'UPDATE testimonials SET reply_text = $1, reply_date = CURRENT_TIMESTAMP WHERE id = $2',
      [replyText, id]
    );

    // 3. Attempt to post reply to Google Business Profile if OAuth is set up and google_review_id exists
    const userResult = await query(
      'SELECT gbp_oauth_refresh_token, gbp_oauth_access_token, gbp_oauth_token_expires_at, gbp_account_id, gbp_location_id FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];
    const isOauthLinked = !!(user && user.gbp_oauth_refresh_token && user.gbp_oauth_access_token);
    const googleReviewId = testimonial.google_review_id;

    let syncStatus = 'saved_locally';
    let gbpMessage = '';

    if (isOauthLinked && googleReviewId && !googleReviewId.startsWith('place-')) {
      try {
        const accessToken = await getValidAccessToken(userId, user);
        const accountId = user.gbp_account_id || 'mock-account-id';
        const locationId = user.gbp_location_id || 'mock-location-id';

        if (accessToken === 'mock-access-token' || accessToken === 'mock-refreshed-access-token') {
          // Mock success for development/testing
          syncStatus = 'synced';
          gbpMessage = 'Posted to Google Business Profile (Mock mode)';
        } else {
          // Make real GMB API call to update/create review reply
          // GMB API path: PUT https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply
          const replyUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${encodeURIComponent(googleReviewId)}/reply`;
          const replyResponse = await fetch(replyUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              comment: replyText
            })
          });

          if (replyResponse.ok) {
            syncStatus = 'synced';
            gbpMessage = 'Successfully posted reply directly to Google Business Profile!';
          } else {
            const errText = await replyResponse.text();
            console.error(`Google Business Profile Reply API failed: ${replyResponse.statusText} - ${errText}`);
            syncStatus = 'sync_failed';
            gbpMessage = `Saved locally, but Google Business Profile reply failed: ${replyResponse.statusText}.`;
          }
        }
      } catch (gbpError) {
        console.error('Error posting reply to Google Business Profile:', gbpError);
        syncStatus = 'sync_failed';
        gbpMessage = 'Saved locally, but could not connect to Google Business Profile.';
      }
    } else {
      gbpMessage = 'Saved locally. Connect your Google Business Profile to publish replies automatically.';
    }

    return res.status(200).json({
      success: true,
      message: 'Reply updated successfully.',
      syncStatus,
      gbpMessage
    });

  } catch (error) {
    await logError(error, 'Save Review Reply Error');
    return res.status(500).json({ message: 'Internal server error. Could not save reply.' });
  }
}
