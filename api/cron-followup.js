import { query } from '../db/index.js';
import { sendEmail } from '../lib/email.js';
import { kv } from '@vercel/kv';

function buildFollowupEmailHtml(subject, bodyHtml, ctaText, ctaUrl) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333333; line-height: 1.6; margin: 0; padding: 0; background-color: #f9f9f9; }
    .email-container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; overflow: hidden; }
    .header { background-color: #007bff; padding: 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; color: #ffffff; }
    .content { padding: 30px; }
    .btn { display: inline-block; padding: 12px 24px; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 15px; text-align: center; background-color: #007bff; }
    .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="email-container" style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; overflow: hidden;">
    <div class="header" style="background-color: #007bff; padding: 30px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; color: #ffffff;">LocalLeads SEO</h1>
    </div>
    <div class="content" style="padding: 30px;">
      ${bodyHtml}
      <div style="text-align: center; margin-top: 25px;">
        <a href="${ctaUrl}" class="btn" style="display: inline-block; padding: 12px 24px; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: bold; text-align: center; background-color: #007bff;">${ctaText}</a>
      </div>
    </div>
    <div class="footer" style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0 0 10px 0;">Sent by LocalLeads SEO.</p>
      <p style="margin: 0;">If you'd like to unsubscribe, reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export default async function handler(req, res) {
  if (process.env.DISABLE_EMAIL_OUTREACH === 'true') {
    return res.status(200).json({ disabled: true, reason: "Follow-up emails disabled by operator" });
  }

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

    let sentCount = 0;

    // Step 1: Follow-up Email #1 (created_at >= 1 day, last_followup_step = 0)
    const step1Result = await query(`
      SELECT l.id, l.email, l.url, l.created_at
      FROM leads l
      LEFT JOIN users u ON l.email = u.email
      WHERE l.source = 'free-audit'
        AND l.last_followup_step = 0
        AND l.created_at <= NOW() - INTERVAL '1 day'
        AND (u.id IS NULL OR (u.is_agency = false AND u.subscription_status != 'active'))
    `);

    for (const lead of step1Result.rows) {
      const auditedUrl = lead.url || 'your website';
      const subject = `Did you see the missed local SEO opportunities for ${auditedUrl}?`;
      const bodyHtml = `
        <p>Hello,</p>
        <p>Yesterday, you requested a free local SEO audit for <strong>${auditedUrl}</strong>.</p>
        <p>Our audit revealed multiple high-value cities and towns nearby where you currently lack optimized search visibility. Your competitors are capturing these customers, but you could easily be matching them.</p>
        <p>With LocalLeads, you don't need to write code or spend thousands on an agency. You can automatically generate hyper-targeted service-area landing pages that rank in search engines and convert visitors into clients.</p>
        <p>Start today and get your first 5 pages completely free.</p>
      `;
      const ctaText = 'Generate 5 Pages Free';
      const ctaUrl = 'https://www.localseogen.com/generate.html';
      const emailHtml = buildFollowupEmailHtml(subject, bodyHtml, ctaText, ctaUrl);

      await sendEmail(lead.email, subject, emailHtml);
      
      await query(`
        UPDATE leads 
        SET last_followup_step = 1, last_followup_at = NOW() 
        WHERE id = $1
      `, [lead.id]);
      sentCount++;
    }

    // Step 2: Follow-up Email #2 (last_followup_at >= 3 days, last_followup_step = 1)
    const step2Result = await query(`
      SELECT l.id, l.email, l.url, l.created_at
      FROM leads l
      LEFT JOIN users u ON l.email = u.email
      WHERE l.source = 'free-audit'
        AND l.last_followup_step = 1
        AND l.last_followup_at <= NOW() - INTERVAL '3 days'
        AND (u.id IS NULL OR (u.is_agency = false AND u.subscription_status != 'active'))
    `);

    for (const lead of step2Result.rows) {
      const subject = 'Simple math: How service area pages grow your business';
      const bodyHtml = `
        <p>Hello,</p>
        <p>We wanted to follow up with a quick insight on how ranking in surrounding cities can significantly increase your customer volume.</p>
        <p>Most local searches look like <em>"[Service] in [City]"</em>. If your site does not have a dedicated page optimizing for that specific town, search engines simply won't list you. By launching pages for each of your service areas, you immediately multiply the number of search phrases you rank for.</p>
        <p>Our Pro Pack allows you to generate 200 location-targeted pages in minutes, complete with schema markup and built-in lead capture forms, for just $99.</p>
      `;
      const ctaText = 'Compare Pricing Packages';
      const ctaUrl = 'https://www.localseogen.com/pricing.html';
      const emailHtml = buildFollowupEmailHtml(subject, bodyHtml, ctaText, ctaUrl);

      await sendEmail(lead.email, subject, emailHtml);

      await query(`
        UPDATE leads 
        SET last_followup_step = 2, last_followup_at = NOW() 
        WHERE id = $1
      `, [lead.id]);
      sentCount++;
    }

    // Step 3: Follow-up Email #3 (last_followup_at >= 3 days, last_followup_step = 2)
    const step3Result = await query(`
      SELECT l.id, l.email, l.url, l.created_at
      FROM leads l
      LEFT JOIN users u ON l.email = u.email
      WHERE l.source = 'free-audit'
        AND l.last_followup_step = 2
        AND l.last_followup_at <= NOW() - INTERVAL '3 days'
        AND (u.id IS NULL OR (u.is_agency = false AND u.subscription_status != 'active'))
    `);

    for (const lead of step3Result.rows) {
      const subject = 'Special offer: Get 20% off LocalLeads package';
      const bodyHtml = `
        <p>Hello,</p>
        <p>This is our final follow-up, and we want to help you take action to grow your online presence.</p>
        <p>For the next 48 hours, we are offering an exclusive 20% discount on any of our page generation credit packages or subscriptions. Use coupon code <strong>LOCAL20</strong> at checkout to unlock your discount.</p>
        <p>Don't let valuable local leads in your surrounding towns go to your competitors. Claim your discount now and dominate your local market.</p>
      `;
      const ctaText = 'Claim 20% Off Now';
      const ctaUrl = 'https://www.localseogen.com/pricing.html';
      const emailHtml = buildFollowupEmailHtml(subject, bodyHtml, ctaText, ctaUrl);

      await sendEmail(lead.email, subject, emailHtml);

      await query(`
        UPDATE leads 
        SET last_followup_step = 3, last_followup_at = NOW() 
        WHERE id = $1
      `, [lead.id]);
      sentCount++;
    }

    // Step 4: Drip sequence for unpaid signups with locked leads
    const dripUsersResult = await query(`
      SELECT u.id, u.email, u.created_at, MAX(l.created_at) as last_lead_at
      FROM users u
      JOIN leads l ON l.user_id = u.id
      WHERE u.subscription_status != 'active'
        AND u.is_agency = false
        AND l.source = 'landing_page'
      GROUP BY u.id, u.email, u.created_at
    `);

    for (const user of dripUsersResult.rows) {
      const userId = user.id;
      const userEmail = user.email;
      const lastLeadAt = new Date(user.last_lead_at);

      // Verify if the user has purchased credits
      const transactionStrings = await kv.lrange(`user:${userId}:credittransactions`, 0, 100) || [];
      const creditTransactions = transactionStrings.map(t => {
        try {
          return JSON.parse(t);
        } catch {
          return {};
        }
      });
      const hasPurchasedCredits = creditTransactions.some(t => t.amount > 0);
      if (hasPurchasedCredits) {
        continue; // Paid user, skip
      }

      // Check user drip step and last drip timestamp in KV
      const dripStepVal = await kv.get(`user:${userId}:drip_step`);
      const dripStep = dripStepVal !== null ? parseInt(dripStepVal, 10) : 0;
      const dripLastAtVal = await kv.get(`user:${userId}:drip_last_at`);
      const dripLastAt = dripLastAtVal ? new Date(dripLastAtVal) : null;

      let shouldSend = false;
      let newStep = dripStep;
      let subject = '';
      let bodyHtml = '';
      let ctaText = '';
      let ctaUrl = '';

      const now = new Date();

      if (dripStep === 0) {
        // Step 1: Send if the most recent locked lead was captured >= 1 day ago
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        if (lastLeadAt <= oneDayAgo) {
          shouldSend = true;
          newStep = 1;
          subject = `Unlocks waiting: You have new leads in your LocalLeads dashboard!`;
          bodyHtml = `
            <p>Hello,</p>
            <p>We noticed that you have captured new customer leads through your service area landing pages, but your account is currently on the unpaid trial.</p>
            <p>To view their contact information and start converting these leads into paying customers, you'll need to upgrade to one of our premium plans.</p>
            <p>Each lead represents a real customer in your target towns looking for your services. Don't let them wait!</p>
          `;
          ctaText = 'Unlock My Leads Now';
          ctaUrl = 'https://www.localseogen.com/dashboard.html';
        }
      } else if (dripStep === 1) {
        // Step 2: Send if the last drip email was sent >= 3 days ago
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        if (dripLastAt && dripLastAt <= threeDaysAgo) {
          shouldSend = true;
          newStep = 2;
          subject = `Don't let your captured leads go cold`;
          bodyHtml = `
            <p>Hello,</p>
            <p>This is a quick reminder that you still have locked customer leads waiting in your LocalLeads dashboard.</p>
            <p>In local business, response time is everything. Leads that are left uncontacted for more than a few days quickly go cold. By upgrading today, you can instantly unlock these leads and contact them before they reach out to your competitors.</p>
            <p>Unlock your leads now and grow your business today.</p>
          `;
          ctaText = 'Upgrade & Reveal Leads';
          ctaUrl = 'https://www.localseogen.com/pricing.html';
        }
      } else if (dripStep === 2) {
        // Step 3: Send if the last drip email was sent >= 3 days ago
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        if (dripLastAt && dripLastAt <= threeDaysAgo) {
          shouldSend = true;
          newStep = 3;
          subject = `Final reminder: Unlock your leads with 20% off`;
          bodyHtml = `
            <p>Hello,</p>
            <p>We want to help you connect with your captured leads before they disappear. This is your final reminder to unlock your dashboard.</p>
            <p>For the next 48 hours, we are offering an exclusive 20% discount on all premium plans. Use coupon code <strong>LOCAL20</strong> at checkout to unlock your leads and start ranking across all your local service areas.</p>
            <p>Don't miss out on these customers.</p>
          `;
          ctaText = 'Claim 20% Off & Unlock';
          ctaUrl = 'https://www.localseogen.com/pricing.html';
        }
      }

      if (shouldSend) {
        const emailHtml = buildFollowupEmailHtml(subject, bodyHtml, ctaText, ctaUrl);
        await sendEmail(userEmail, subject, emailHtml);
        await kv.set(`user:${userId}:drip_step`, newStep);
        await kv.set(`user:${userId}:drip_last_at`, now.toISOString());
        sentCount++;
      }
    }

    return res.status(200).json({ message: `Success. Sent ${sentCount} follow-up emails.` });

  } catch (error) {
    console.error('Error in cron-followup endpoint:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
