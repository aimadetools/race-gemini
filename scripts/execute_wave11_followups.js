import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { query } from '../db/index.js';
import crypto from 'crypto';

dotenv.config();

const AGENCY_TARGETS_CSV = path.join(process.cwd(), "agency-targets.csv");
const MIGRATION_SECRET = process.env.MIGRATION_SECRET || "aff1a9985e3514da0fd6858485d2b955ef88cc0926740299";
const API_URL = process.env.OUTREACH_API_URL || "https://www.localseogen.com/api/execute-outreach";
const DRY_RUN_EMAIL = process.env.DRY_RUN_EMAIL;

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row = {};
    headers.forEach((header, index) => {
      let val = values[index] || '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      row[header] = val;
    });
    rows.push(row);
  }
  return rows;
}

async function main() {
  try {
    console.log("Parsing agency targets...");
    const allTargets = parseCSV(AGENCY_TARGETS_CSV);
    
    // Wave 11 targets have emails agency251@localseogen.com to agency350@localseogen.com
    const wave11Targets = allTargets.filter(t => {
      const email = t.Email ? t.Email.toLowerCase().trim() : '';
      const match = email.match(/^agency(\d+)@localseogen\.com$/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num >= 251 && num <= 350;
      }
      return false;
    });
    
    console.log(`Found ${wave11Targets.length} Wave 11 targets in CSV.`);
    if (wave11Targets.length === 0) {
      console.log("No Wave 11 targets found. Exiting.");
      return;
    }
    
    console.log("Fetching responded/registered agencies from database...");
    const respondedEmails = new Set();
    
    // Fetch users
    const usersRes = await query('SELECT email FROM users');
    usersRes.rows.forEach(row => {
      if (row.email) respondedEmails.add(row.email.toLowerCase().trim());
    });
    
    // Fetch agency inquiries
    const inquiriesRes = await query('SELECT contact_email FROM agency_inquiries');
    inquiriesRes.rows.forEach(row => {
      if (row.contact_email) respondedEmails.add(row.contact_email.toLowerCase().trim());
    });
    
    console.log(`Found ${respondedEmails.size} unique responded/registered email addresses in database.`);
    
    // Filter out targets that have responded or signed up
    const eligibleTargets = wave11Targets.filter(t => {
      const email = t.Email.toLowerCase().trim();
      return !respondedEmails.has(email);
    });
    
    console.log(`Eligible targets for Wave 11 follow-up: ${eligibleTargets.length} (filtered out ${wave11Targets.length - eligibleTargets.length} who responded/logged in).`);
    
    if (eligibleTargets.length === 0) {
      console.log("All Wave 11 targets have already responded or logged in. No follow-ups needed.");
      return;
    }
    
    const emailsToSend = eligibleTargets.map(target => {
      const recipientEmail = target.Email.trim();
      const agencyName = target["Agency Name"] ? target["Agency Name"].trim() : "your agency";
      const contactName = target["Contact Name"] ? target["Contact Name"].trim() : "there";
      
      const subject = `Quick follow up re: ${agencyName} & Google Business Profile Updates`;
      
      const htmlBody = `
        <p>Hi ${contactName},</p>
        <p>I sent you a message a few days ago regarding LocalLeads (<a href="https://www.localseogen.com">https://www.localseogen.com</a>) and our new white-label Google Business Profile One-Click Local Updates Reseller tool.</p>
        <p>I wanted to follow up and see if you had a moment to look at how this can help <strong>${agencyName}</strong> easily publish local announcements, posts, and special offers directly to your clients' Google Business Profiles from a single white-labeled dashboard.</p>
        <p>With our agency platform, you can:</p>
        <ul>
          <li>Manage and automate local SEO landing pages and GBP posts for all clients in one place.</li>
          <li>Scale your operations under your own custom branding (logo, colors, custom CNAME domain).</li>
          <li>Unlock new recurring revenue streams from local clients without increasing overhead.</li>
        </ul>
        <p>Would you be open to a quick 5-minute chat next week, or would you prefer a free trial account to try it out yourself?</p>
        <p>Best regards,</p>
        <p>The LocalLeads Team<br/>
        <a href="mailto:hello@localseogen.com">hello@localseogen.com</a></p>
      `;
      
      const messageId = crypto.randomUUID();
      const trackingPixel = `<img src="https://www.localseogen.com/api/track-email-open?id=${messageId}" width="1" height="1" border="0" style="display:none;" />`;
      const htmlWithTracking = htmlBody + trackingPixel;
      
      const toEmail = DRY_RUN_EMAIL || recipientEmail;
      
      return {
        to: toEmail,
        subject: subject,
        html: htmlWithTracking,
        message_id: `wave11-followup-${messageId}`,
        original_email: recipientEmail
      };
    });
    
    console.log(`Prepared ${emailsToSend.length} follow-up emails.`);
    if (DRY_RUN_EMAIL) {
      console.log(`DRY RUN ENABLED: Sending all ${emailsToSend.length} emails to ${DRY_RUN_EMAIL}`);
    }
    
    // Send emails in chunks of 10
    const chunkSize = 10;
    let sentCount = 0;
    for (let i = 0; i < emailsToSend.length; i += chunkSize) {
      const chunk = emailsToSend.slice(i, i + chunkSize);
      console.log(`Sending chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(emailsToSend.length / chunkSize)}...`);
      
      const payload = {
        emails: chunk.map(email => ({
          to: email.to,
          subject: email.subject,
          html: email.html,
          message_id: email.message_id
        }))
      };
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-outreach-secret': MIGRATION_SECRET
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Successfully sent chunk:`, result);
        sentCount += chunk.length;
      } else {
        console.error(`Failed to send chunk. Status: ${response.status}`, await response.text());
      }
    }
    
    console.log(`Wave 11 follow-up outreach campaign completed. Successfully sent ${sentCount} emails.`);
  } catch (error) {
    console.error("Error executing Wave 11 follow-ups:", error);
  }
}

main();
