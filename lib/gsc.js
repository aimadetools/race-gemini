import fetch from 'node-fetch';
import crypto from 'crypto';

/**
 * Checks the indexing status of a page URL using Google Search Console URL Inspection API.
 * Falls back to a deterministic mock in testing/development or if GSC credentials are missing.
 * 
 * @param {string} pageUrl - The fully qualified page URL to inspect.
 * @param {string} siteUrl - The verified Search Console site property URL.
 */
export async function checkGscIndexingStatus(pageUrl, siteUrl) {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY;

  if (!clientEmail || !privateKey || process.env.NODE_ENV === 'test') {
    // Generate a deterministic mock response based on the page URL
    const hash = crypto.createHash('md5').update(pageUrl).digest('hex');
    const charCode = hash.charCodeAt(0);
    
    let verdict = 'NEUTRAL';
    let coverageState = 'Crawled - currently not indexed';
    
    if (charCode % 3 === 0) {
      verdict = 'PASS';
      coverageState = 'Indexed, primary';
    } else if (charCode % 3 === 1) {
      verdict = 'NEUTRAL';
      coverageState = 'Crawled - currently not indexed';
    } else {
      verdict = 'FAIL';
      coverageState = 'Excluded by noindex tag';
    }

    return {
      success: true,
      verdict,
      coverageState,
      lastCrawlTime: new Date(Date.now() - 3600000 * 24).toISOString(), // 24 hours ago
      mocked: true
    };
  }

  try {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: tokenUrl,
      exp: now + 3600,
      iat: now
    })).toString('base64url');

    const signInput = `${header}.${payload}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signInput);
    const signature = signer.sign(privateKey.replace(/\\n/g, '\n'), 'base64url');
    
    const jwt = `${signInput}.${signature}`;

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Failed to get OAuth token: ${errText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const inspectUrl = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
    const inspectRes = await fetch(inspectUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inspectionUrl: pageUrl,
        siteUrl: siteUrl
      })
    });

    if (!inspectRes.ok) {
      const errText = await inspectRes.text();
      throw new Error(`GSC URL Inspection failed: ${errText}`);
    }

    const inspectData = await inspectRes.json();
    const indexStatus = inspectData.inspectionResult?.indexStatusResult || {};

    return {
      success: true,
      verdict: indexStatus.verdict || 'NEUTRAL',
      coverageState: indexStatus.coverageState || 'Unknown indexing state',
      lastCrawlTime: indexStatus.lastCrawlTime || null,
      mocked: false
    };
  } catch (error) {
    console.error('Error querying Google Search Console:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
