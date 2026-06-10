import { query } from '../db/index.js';
import { checkGscIndexingStatus } from '../lib/gsc.js';
import { addIndexingNotification } from '../lib/indexing.js';
import slugify from 'slugify';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { authorization } = req.headers;
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // 1. Fetch Pro and Agency plan users
    const usersResult = await query(
      `SELECT id, email, custom_domain FROM users WHERE is_agency = true OR subscription_status = 'active'`
    );

    let totalChecked = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    let notificationsSent = 0;

    for (const user of usersResult.rows) {
      // 2. Fetch pages for this user
      const pagesResult = await query(
        `SELECT id, service, town, business_name, indexing_status FROM seo_pages WHERE user_id = $1`,
        [user.id]
      );

      for (const page of pagesResult.rows) {
        // Construct page URL and site URL
        const serviceSlug = slugify(page.service || '', { lower: true, strict: true });
        const townSlug = slugify(page.town || '', { lower: true, strict: true });

        let pageUrl;
        let siteUrl;

        if (user.custom_domain) {
          siteUrl = `https://${user.custom_domain}/`;
          pageUrl = `https://${user.custom_domain}/${serviceSlug}-in-${townSlug}.html`;
        } else {
          const defaultDomain = process.env.DOMAIN_URL || 'https://www.localseogen.com';
          siteUrl = `${defaultDomain}/`;
          pageUrl = `${defaultDomain}/${user.id}/${serviceSlug}-in-${townSlug}.html`;
        }

        totalChecked++;

        // 3. Inspect Search Console indexing status
        const gscResult = await checkGscIndexingStatus(pageUrl, siteUrl);

        if (gscResult.success) {
          const status = gscResult.coverageState || 'unknown';
          const oldStatus = page.indexing_status || 'unknown';

          // Update PostgreSQL entry
          await query(
            `UPDATE seo_pages SET indexing_status = $1, last_indexing_check = NOW(), updated_at = NOW() WHERE id = $2`,
            [status, page.id]
          );
          totalUpdated++;

          // 4. Send notification if indexing status has changed
          if (status !== oldStatus) {
            const message = `Google Search Console indexing status for ${page.business_name} (${page.town}) changed from "${oldStatus}" to "${status}".`;
            await addIndexingNotification(user.id, message, 'success');
            notificationsSent++;
          }
        } else {
          totalFailed++;
          console.error(`GSC indexing status check failed for page ID ${page.id}: ${gscResult.error}`);
        }
      }
    }

    return res.status(200).json({
      message: 'Weekly Search Console automated index sync completed.',
      checked: totalChecked,
      updated: totalUpdated,
      failed: totalFailed,
      notificationsSent
    });

  } catch (error) {
    console.error('Error in cron-gsc-check endpoint:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
