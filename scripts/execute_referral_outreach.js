import { query } from '../db/index.js';
import fetch from 'node-fetch';

const MIGRATION_SECRET = process.env.MIGRATION_SECRET || "aff1a9985e3514da0fd6858485d2b955ef88cc0926740299";
const API_URL = process.env.OUTREACH_API_URL || "https://www.localseogen.com/api/execute-outreach";
const DRY_RUN_EMAIL = process.env.DRY_RUN_EMAIL;

async function main() {
  try {
    if (DRY_RUN_EMAIL) {
      console.log(`DRY RUN ENABLED: Sending all emails to ${DRY_RUN_EMAIL}`);
    }
    console.log("Fetching top referrers from database...");
    const referrersRes = await query(`
      SELECT DISTINCT u.id, u.email, u.referral_code
      FROM users u
      JOIN referrals r ON r.referrer_id = u.id
      ORDER BY u.id ASC
    `);

    const referrers = referrersRes.rows;
    console.log(`Found ${referrers.length} referrers.`);

    if (referrers.length === 0) {
      console.log("No referrers found in database. Exiting.");
      return;
    }

    const emailsToSend = referrers.map(user => {
      const email = DRY_RUN_EMAIL || user.email;
      const refCode = user.referral_code;

      const subject = "Earn 20% Recurring Commission with the LocalLeads Referral Program!";
      const htmlBody = `
        <p>Hi,</p>
        <p>We noticed you've been using LocalLeads to scale your local SEO and landing page generation. We'd love to invite you to join our Referral Program!</p>
        <p>By sharing your unique referral link, you can earn a <strong>20% recurring commission</strong> on every single payment made by users you refer to LocalLeads.</p>
        <p>Here is your unique referral code: <strong>${refCode}</strong><br />
        Your referral link: <a href="https://www.localseogen.com/referral-program.html?ref=${refCode}">https://www.localseogen.com/referral-program.html?ref=${refCode}</a></p>
        <p><strong>How it works:</strong></p>
        <ol>
          <li>Share your referral link with other businesses, agencies, or contractors.</li>
          <li>When they sign up and upgrade to any of our credit packs or subscription plans, you earn a 20% recurring commission.</li>
          <li>Track your clicks, signups, and commissions directly in your referral dashboard: <a href="https://www.localseogen.com/referral-dashboard.html">https://www.localseogen.com/referral-dashboard.html</a></li>
        </ol>
        <p>Thank you for being a valued user!</p>
        <p>Best regards,<br />
        The LocalLeads Team<br />
        hello@localseogen.com<br />
        <a href="https://www.localseogen.com">https://www.localseogen.com</a></p>
      `;
      const trackingPixel = `<img src="https://www.localseogen.com/api/track-email-open?id=${user.id}" width="1" height="1" border="0" style="display:none;" />`;
      const htmlWithTracking = htmlBody + trackingPixel;

      return {
        to: email,
        subject: subject,
        html: htmlWithTracking,
        message_id: `ref-outreach-${user.id}`
      };
    });

    console.log(`Prepared ${emailsToSend.length} referral outreach emails.`);

    // Send emails in chunks of 10
    const chunkSize = 10;
    for (let i = 0; i < emailsToSend.length; i += chunkSize) {
      const chunk = emailsToSend.slice(i, i + chunkSize);
      console.log(`Sending chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(emailsToSend.length / chunkSize)}...`);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-outreach-secret': MIGRATION_SECRET
        },
        body: JSON.stringify({ emails: chunk })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Successfully sent chunk:`, result);
      } else {
        console.error(`Failed to send chunk. Status: ${response.status}`, await response.text());
      }
    }

    console.log("Referral outreach campaign completed.");
  } catch (error) {
    console.error("Error executing referral outreach:", error);
  }
}

main();
