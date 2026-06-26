import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { logError } from '../lib/logger.js';
import { query } from '../db/index.js';
import { checkGscIndexingStatus, requestGoogleIndexing } from '../lib/gsc.js';
import slugify from 'slugify';
import { recordFailedIndexingRequest, removeSuccessfulIndexingRequest } from '../lib/indexing.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const cookies = parse(req.headers.cookie || '');
  const token = cookies.authToken;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated. Please log in.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    await logError(error, 'Check Indexing - JWT Verification Error', 'check_indexing_error.log');
    return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
  }

  const userId = decoded.userId;
  const { pageId } = req.body;

  if (!pageId) {
    return res.status(400).json({ message: 'Missing required field: pageId' });
  }

  try {
    const pageResult = await query(
      'SELECT id, user_id, service, town, business_name FROM seo_pages WHERE id = $1',
      [pageId]
    );
    if (pageResult.rows.length === 0) {
      return res.status(404).json({ message: 'Page not found.' });
    }

    const pageRow = pageResult.rows[0];
    
    // Verify user owns the page, OR is the agency that manages the client who owns the page
    let isAuthorized = false;
    if (pageRow.user_id === userId) {
      isAuthorized = true;
    } else {
      const pageOwnerResult = await query('SELECT agency_id FROM users WHERE id = $1', [pageRow.user_id]);
      if (pageOwnerResult.rows.length > 0 && pageOwnerResult.rows[0].agency_id === userId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized. You do not own this page.' });
    }

    // Construct pageUrl and siteUrl
    const userResult = await query('SELECT custom_domain FROM users WHERE id = $1', [pageRow.user_id]);
    const customDomain = userResult.rows[0]?.custom_domain;
    
    const serviceSlug = slugify(pageRow.service || '', { lower: true, strict: true });
    const townSlug = slugify(pageRow.town || '', { lower: true, strict: true });
    
    let pageUrl;
    let siteUrl;
    
    if (customDomain) {
      siteUrl = `https://${customDomain}/`;
      pageUrl = `https://${customDomain}/${serviceSlug}-in-${townSlug}.html`;
    } else {
      const defaultDomain = process.env.DOMAIN_URL || 'https://www.localseogen.com';
      siteUrl = `${defaultDomain}/`;
      pageUrl = `${defaultDomain}/${pageRow.user_id}/${serviceSlug}-in-${townSlug}.html`;
    }

    // Query Google Search Console URL Inspection
    const gscResult = await checkGscIndexingStatus(pageUrl, siteUrl);

    if (gscResult.success) {
      let status = gscResult.coverageState || 'unknown';
      const statusLower = status.toLowerCase();
      const isIndexed = (statusLower.includes('indexed') || statusLower === 'pass') && !statusLower.includes('not indexed') && !statusLower.includes('noindex');
      
      let indexingRequested = false;
      let indexingError = null;

      if (!isIndexed) {
        // Trigger Google Indexing API submission for newly generated landing pages
        const indexingApiResult = await requestGoogleIndexing(pageUrl);
        if (indexingApiResult.success) {
          indexingRequested = true;
          // Append to status to show in UI that crawler request was submitted
          status = `${status} (Indexing Requested)`;
          await removeSuccessfulIndexingRequest(userId, pageUrl);
        } else {
          indexingError = indexingApiResult.error;
          await recordFailedIndexingRequest(userId, pageUrl, indexingError);
        }
      } else {
        await removeSuccessfulIndexingRequest(userId, pageUrl);
      }

      // Update page in PostgreSQL
      await query(
        'UPDATE seo_pages SET indexing_status = $1, last_indexing_check = NOW(), updated_at = NOW() WHERE id = $2',
        [status, pageId]
      );

      return res.status(200).json({
        message: indexingRequested 
          ? 'Indexing status checked and crawl request submitted successfully.' 
          : 'Indexing status checked successfully.',
        indexingStatus: status,
        lastIndexingCheck: new Date().toISOString(),
        indexingRequested,
        indexingError
      });
    } else {
      return res.status(500).json({
        message: 'Failed to inspect URL on Google Search Console.',
        error: gscResult.error
      });
    }
  } catch (error) {
    await logError(error, 'Check Indexing - General Error', 'check_indexing_error.log');
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
