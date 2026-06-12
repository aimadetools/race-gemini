import jwt from 'jsonwebtoken';
import { query } from '../../../db/index.js';
import { encrypt } from '../../../lib/crypto-helper.js';
import { logError } from '../../../lib/logger.js';

async function discoverAndSaveLocation(userId, accessToken) {
  let accountId = 'mock-account-id';
  let locationId = 'mock-location-id';
  
  if (accessToken && accessToken !== 'mock-access-token' && !accessToken.startsWith('mock_')) {
    try {
      const accountsRes = await fetch('https://mybusinessbusinessinformation.googleapis.com/v1/accounts', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        if (accountsData.accounts && accountsData.accounts.length > 0) {
          const accountName = accountsData.accounts[0].name; // accounts/{accountId}
          accountId = accountName.split('/')[1] || accountId;
          
          const locationsRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          
          if (locationsRes.ok) {
            const locationsData = await locationsRes.json();
            if (locationsData.locations && locationsData.locations.length > 0) {
              const locationName = locationsData.locations[0].name; // locations/{locationId}
              locationId = locationName.split('/')[1] || locationId;
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to discover location from Google API:', err);
    }
  }
  
  await query(
    `UPDATE users SET 
       gbp_account_id = $1, 
       gbp_location_id = $2
     WHERE id = $3`,
    [accountId, locationId, userId]
  );
  
  return { accountId, locationId };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send('Missing authorization code or state.');
  }

  try {
    // 1. Verify state token against JWT_SECRET (CSRF protection)
    let decodedState;
    try {
      decodedState = jwt.verify(state, process.env.JWT_SECRET || 'dev_jwt_secret_key_for_testing');
    } catch (error) {
      return res.status(400).send('Invalid or expired state parameter. Please try again.');
    }

    const userId = decodedState.userId;

    // 2. Exchange authorization code for tokens
    let tokens;
    const domain = process.env.DOMAIN_URL || (req.headers.host ? `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}` : 'https://www.localseogen.com');
    const redirectUri = `${domain}/api/auth/google/callback`;

    if (code === 'mock-auth-code') {
      tokens = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600
      };
    } else {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || 'dummy-google-client-id',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-google-client-secret',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Google OAuth token exchange failed: ${response.statusText} - ${errBody}`);
      }

      tokens = await response.json();
    }

    // 3. Save tokens in PostgreSQL database
    const encryptedRefreshToken = encrypt(tokens.refresh_token);
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    const updateResult = await query(
      `UPDATE users SET 
        gbp_oauth_refresh_token = $1, 
        gbp_oauth_access_token = $2, 
        gbp_oauth_token_expires_at = $3,
        gbp_sync_enabled = TRUE
       WHERE id = $4
       RETURNING id`,
      [encryptedRefreshToken, tokens.access_token, expiresAt, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).send('User not found.');
    }

    // 4. Auto-discover Account & Location ID
    await discoverAndSaveLocation(userId, tokens.access_token);

    // Redirect to dashboard with success status query param
    res.writeHead(302, { Location: '/dashboard.html?gbp_connected=true' });
    res.end();
  } catch (error) {
    await logError(error, 'Google Auth Callback Error', 'gbp_auth_error.log');
    return res.status(500).send('Internal Server Error. Could not complete Google Auth connection.');
  }
}
export { discoverAndSaveLocation };
