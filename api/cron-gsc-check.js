import { query } from '../db/index.js';
import { checkGscIndexingStatus } from '../lib/gsc.js';
import { addIndexingNotification } from '../lib/indexing.js';
import slugify from 'slugify';
import { sendEmail } from '../lib/email.js';

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

            // Send automated email alert when GSC indexes the client's newly generated pages
            const isNowIndexed = status.toLowerCase().includes('indexed');
            const wasIndexedBefore = oldStatus && oldStatus.toLowerCase().includes('indexed');

            if (isNowIndexed && !wasIndexedBefore) {
              const subject = `🚀 Page Indexed: ${page.service} in ${page.town}`;
              const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                  <h2 style="color: #10b981; margin-top: 0;">Your page has been indexed by Google!</h2>
                  <p>Hi there,</p>
                  <p>Great news! Google Search Console has successfully inspected and indexed your newly generated local landing page.</p>
                  <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0 0 10px 0;"><strong>Business Name:</strong> ${page.business_name}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Service:</strong> ${page.service}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Service Area:</strong> ${page.town}</p>
                    <p style="margin: 0;"><strong>Page URL:</strong> <a href="${pageUrl}" style="color: #10b981; text-decoration: none; word-break: break-all;">${pageUrl}</a></p>
                  </div>
                  <p>This page is now eligible to appear in Google search results, driving more local customers to your business.</p>
                  <p>To view your full performance report and capture leads, check your dashboard:</p>
                  <p style="margin: 25px 0 15px 0;">
                    <a href="https://www.localseogen.com/dashboard.html" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
                  </p>
                  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0 20px 0;" />
                  <p style="font-size: 0.85rem; color: #6b7280; line-height: 1.5;">
                    Best regards,<br/>
                    <strong>The LocalLeads Team</strong><br/>
                    hello@localseogen.com
                  </p>
                </div>
              `;

              if (process.env.DISABLE_EMAIL_OUTREACH !== 'true') {
                try {
                  await sendEmail(user.email, subject, emailHtml);
                  console.log(`Sent GSC index email alert to ${user.email} for page ID ${page.id}`);
                } catch (emailError) {
                  console.error(`Failed to send GSC index email to ${user.email}:`, emailError);
                }
              }
            }
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
