import { query } from '../db/index.js';
import { sendEmail } from '../lib/email.js';
import { kv } from '@vercel/kv';
import { logError, logInfo } from '../lib/logger.js';

async function checkIsPaidUser(userId, currentKv) {
  let isPaidUser = false;
  try {
    const userResult = await query('SELECT is_agency, subscription_status FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length > 0) {
      const u = userResult.rows[0];
      if (u.is_agency || u.subscription_status === 'active') {
        isPaidUser = true;
      }
    }
    if (!isPaidUser) {
      const transactionStrings = await currentKv.lrange(`user:${userId}:credittransactions`, 0, 100) || [];
      const creditTransactions = transactionStrings.map(t => JSON.parse(t));
      isPaidUser = creditTransactions.some(t => t.amount > 0);
    }
  } catch (error) {
    await logError(error, `Failed to check paid status for user ${userId}`);
  }
  return isPaidUser;
}

export default async function handler(req, res, currentKvClient) {
  if (process.env.DISABLE_EMAIL_OUTREACH === 'true') {
    return res.status(200).json({ disabled: true, reason: 'Email outreach is disabled' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const currentKv = currentKvClient || kv;

  try {
    const { authorization } = req.headers;
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get all users who have generated pages
    const usersResult = await query(`
      SELECT DISTINCT u.id, u.email, u.name
      FROM users u
      INNER JOIN seo_pages sp ON sp.user_id = u.id
      WHERE u.weekly_report_enabled IS NOT FALSE
    `);


    const users = usersResult.rows;
    let emailsSent = 0;

    for (const user of users) {
      const userId = user.id;
      const userEmail = user.email;
      const userName = user.name || 'LocalLeads Customer';

      // 1. Get total active pages count
      const pagesCountResult = await query('SELECT COUNT(*) as count FROM seo_pages WHERE user_id = $1', [userId]);
      const totalPages = parseInt(pagesCountResult.rows[0]?.count || '0', 10);

      // 2. Get views and visitors in the last 7 days from user_events
      const eventsResult = await query(`
        SELECT 
          COUNT(CASE WHEN ue.event_name = 'page_view' THEN 1 END) as views_count,
          COUNT(DISTINCT CASE WHEN ue.event_name = 'page_view' THEN ue.event_data->>'ip' END) as visitors_count
        FROM user_events ue
        LEFT JOIN seo_pages sp ON sp.id::text = ue.event_data->>'pageId'
        WHERE (ue.user_id = $1::text OR sp.user_id::text = $1::text)
          AND ue.timestamp >= NOW() - INTERVAL '7 days'
      `, [userId]);

      const views = parseInt(eventsResult.rows[0]?.views_count || '0', 10);
      const visitors = parseInt(eventsResult.rows[0]?.visitors_count || '0', 10);

      // 3. Get leads captured in the last 7 days
      const leadsResult = await query(`
        SELECT COUNT(*) as count 
        FROM leads 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
      `, [userId]);
      const newLeads = parseInt(leadsResult.rows[0]?.count || '0', 10);

      // 4. Check paid user status and count locked/unlocked leads
      const isPaidUser = await checkIsPaidUser(userId, currentKv);
      let lockedLeads = 0;

      if (!isPaidUser) {
        const lockedResult = await query(`
          SELECT COUNT(*) as count 
          FROM leads 
          WHERE user_id = $1 AND is_unlocked = false
        `, [userId]);
        lockedLeads = parseInt(lockedResult.rows[0]?.count || '0', 10);
      }

      // 5. Get indexed pages count
      const indexedResult = await query(`
        SELECT COUNT(*) as count 
        FROM seo_pages 
        WHERE user_id = $1 AND indexing_status = 'Indexed, primary'
      `, [userId]);
      const indexedPages = parseInt(indexedResult.rows[0]?.count || '0', 10);

      // 6. Build and send email
      const subject = `Your LocalLeads SEO Performance Weekly Report`;
      
      let lockedAlertHtml = '';
      let ctaUrl = 'https://www.localseogen.com/dashboard.html';
      let ctaText = 'Open Your Dashboard';

      if (!isPaidUser && lockedLeads > 0) {
        lockedAlertHtml = `
          <div class="alert-box" style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <div class="alert-title" style="font-size: 15px; font-weight: 700; color: #92400e; margin-bottom: 6px;">
              🔒 Action Required: ${lockedLeads} Locked Leads Waiting
            </div>
            <div class="alert-desc" style="font-size: 13.5px; color: #78350f; line-height: 1.5;">
              You have customer leads waiting in your dashboard. Because you are on a free trial, details (name, email, phone) are locked. Buy a credit pack or unlock single leads for 1 credit each to see their details.
            </div>
          </div>
        `;
        ctaText = 'Unlock Leads Now';
        ctaUrl = 'https://www.localseogen.com/dashboard.html#captured-leads-card';
      } else if (newLeads > 0) {
        lockedAlertHtml = `
          <div class="alert-box" style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
            <div class="alert-title" style="font-size: 15px; font-weight: 700; color: #065f46; margin-bottom: 6px;">
              🎉 Awesome Work! ${newLeads} New Leads This Week
            </div>
            <div class="alert-desc" style="font-size: 13.5px; color: #047857; line-height: 1.5;">
              Your service-area landing pages are successfully capturing customer requests. Log in to your dashboard to review details and follow up with them.
            </div>
          </div>
        `;
        ctaText = 'View New Leads';
        ctaUrl = 'https://www.localseogen.com/dashboard.html#captured-leads-card';
      }

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', Arial, sans-serif; color: #1f2937; line-height: 1.6; margin: 0; padding: 0; background-color: #f3f4f6; }
    .email-container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.025em; }
    .header p { margin: 8px 0 0 0; font-size: 14px; color: #bfdbfe; }
    .content { padding: 30px; }
    .greeting { font-size: 16px; margin-bottom: 20px; color: #374151; }
    .metrics-grid { display: table; width: 100%; border-collapse: separate; border-spacing: 12px; margin: 20px 0; }
    .metrics-row { display: table-row; }
    .metric-card { display: table-cell; width: 50%; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; }
    .metric-value { font-size: 28px; font-weight: 700; color: #1e3a8a; margin-bottom: 4px; }
    .metric-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .indexing-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .indexing-title { font-size: 14px; font-weight: 700; color: #1e40af; margin-bottom: 8px; }
    .indexing-stat { font-size: 16px; color: #1e3a8a; }
    .alert-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .alert-title { font-size: 15px; font-weight: 700; color: #92400e; margin-bottom: 6px; }
    .alert-desc { font-size: 13.5px; color: #78350f; line-height: 1.5; }
    .cta-container { text-align: center; margin: 30px 0 10px 0; }
    .btn { display: inline-block; padding: 12px 30px; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2); }
    .footer { background: #f9fafb; padding: 25px 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 0 0 8px 0; }
  </style>
</head>
<body>
  <div class="email-container" style="max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
    <div class="header" style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 30px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.025em;">LocalLeads SEO</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #bfdbfe;">Weekly Performance Report</p>
    </div>
    
    <div class="content" style="padding: 30px;">
      <p class="greeting" style="font-size: 16px; margin-bottom: 20px; color: #374151;">Hi ${userName},</p>
      <p style="margin: 0 0 20px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">Here is how your local service area landing pages performed over the last 7 days.</p>
      
      <div class="metrics-grid" style="display: table; width: 100%; border-collapse: separate; border-spacing: 12px; margin: 20px 0;">
        <div class="metrics-row" style="display: table-row;">
          <div class="metric-card" style="display: table-cell; width: 50%; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 20px; text-align: center;">
            <div class="metric-value" style="font-size: 28px; font-weight: 700; color: #1e3a8a; margin-bottom: 4px;">${views}</div>
            <div class="metric-label" style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Page Views</div>
          </div>
          <div class="metric-card" style="display: table-cell; width: 50%; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 20px; text-align: center;">
            <div class="metric-value" style="font-size: 28px; font-weight: 700; color: #1e3a8a; margin-bottom: 4px;">${visitors}</div>
            <div class="metric-label" style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Unique Visitors</div>
          </div>
        </div>
        <div class="metrics-row" style="display: table-row;">
          <div class="metric-card" style="display: table-cell; width: 50%; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 20px; text-align: center;">
            <div class="metric-value" style="font-size: 28px; font-weight: 700; color: #1e3a8a; margin-bottom: 4px;">${newLeads}</div>
            <div class="metric-label" style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">New Leads</div>
          </div>
          <div class="metric-card" style="display: table-cell; width: 50%; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 20px; text-align: center;">
            <div class="metric-value" style="font-size: 28px; font-weight: 700; color: #1e3a8a; margin-bottom: 4px;">${totalPages}</div>
            <div class="metric-label" style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Active SEO Pages</div>
          </div>
        </div>
      </div>

      <div class="indexing-box" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <div class="indexing-title" style="font-size: 14px; font-weight: 700; color: #1e40af; margin-bottom: 8px;">Google Search Console Status</div>
        <div class="indexing-stat" style="font-size: 16px; color: #1e3a8a;">
          <strong>${indexedPages} of ${totalPages}</strong> pages are indexed on Google.
        </div>
      </div>

      ${lockedAlertHtml}

      <div class="cta-container" style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${ctaUrl}" class="btn" style="display: inline-block; padding: 12px 30px; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);">${ctaText}</a>
      </div>
    </div>
    
    <div class="footer" style="background: #f9fafb; padding: 25px 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0;">LocalLeads — Automated Local SEO Landing Pages</p>
      <p style="margin: 0 0 8px 0;">If you have any questions, reply to this email or visit our Help Center.</p>
      <p style="margin: 0;">No longer want to receive these reports? <a href="https://www.localseogen.com/api/unsubscribe-seo-report?email=${encodeURIComponent(userEmail)}" style="color: #3b82f6; text-decoration: underline;">Unsubscribe</a></p>

    </div>
  </div>
</body>
</html>
      `;

      await sendEmail(userEmail, subject, emailHtml);
      emailsSent++;
      await logInfo(`Weekly report sent to ${userEmail} (ID: ${userId})`, 'Weekly SEO Report Cron');
    }

    return res.status(200).json({
      message: 'Weekly SEO report compilation completed successfully.',
      usersReported: users.length,
      emailsSent
    });

  } catch (error) {
    await logError(error, 'Weekly SEO Report Cron Exception');
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
