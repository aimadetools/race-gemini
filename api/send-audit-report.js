import sgMail from '@sendgrid/mail';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

function buildAuditEmailHtml(auditedUrl, auditResults, branding) {
    const primaryColor = branding.primaryColor || '#007bff';
    const logoHtml = branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.name} Logo" style="max-height: 50px;">` : `<h2>${branding.name}</h2>`;
    const agencyName = branding.name || 'LocalLeads';

    let summaryRowsHtml = '';

    // Helper to add a metric row
    function addRow(name, value, statusClass = '') {
        summaryRowsHtml += `
          <div class="metric" style="margin-bottom: 12px;">
            <span class="metric-name" style="font-weight: bold; color: #555555;">${name}:</span>
            <span class="metric-value ${statusClass}" style="font-weight: bold; margin-left: 5px;">${value}</span>
          </div>
        `;
    }

    // 1. Mobile Friendliness
    const mobileAudit = auditResults['mobile-friendliness'] || auditResults['mobile_friendliness_audit'];
    if (mobileAudit) {
        if (mobileAudit.error) {
            addRow('Mobile Friendliness', 'Not Tested', 'status-warn');
        } else {
            const isFriendly = mobileAudit.is_mobile_friendly;
            const score = mobileAudit.score;
            addRow('Mobile Friendliness', isFriendly ? `Friendly (${score}/100)` : `Not Friendly (${score}/100)`, isFriendly ? 'status-pass' : 'status-fail');
        }
    }

    // 2. Page Load Times
    const loadTimeAudit = auditResults['page-load-times'] || auditResults['page_load_time_audit'];
    if (loadTimeAudit) {
        if (loadTimeAudit.load_time !== undefined) {
            const seconds = loadTimeAudit.load_time;
            addRow('Page Load Time', `${seconds} seconds`, seconds < 3 ? 'status-pass' : 'status-warn');
        } else if (loadTimeAudit.desktop || loadTimeAudit.mobile) {
            addRow('Page Load Time', `Desktop: ${loadTimeAudit.desktop || 'N/A'}, Mobile: ${loadTimeAudit.mobile || 'N/A'}`);
        }
    }

    // 3. Broken Links
    const brokenLinksAudit = auditResults['broken-links'] || auditResults['broken_links_audit'];
    if (brokenLinksAudit) {
        const brokenLinks = brokenLinksAudit.broken_links || [];
        addRow('Broken Links', `${brokenLinks.length} found`, brokenLinks.length === 0 ? 'status-pass' : 'status-fail');
    }

    // 4. Image Alt Attributes
    const altAudit = auditResults['alt-attributes'] || auditResults['alt_attributes_audit'];
    if (altAudit) {
        const issuesCount = Array.isArray(altAudit) ? altAudit.length : (altAudit.issues ? altAudit.issues.length : 0);
        addRow('Missing Alt Tags', `${issuesCount} images missing alt tags`, issuesCount === 0 ? 'status-pass' : 'status-warn');
    }

    // 5. GBP Category Check
    const gbpAudit = auditResults['gbp_category_check'];
    if (gbpAudit && gbpAudit.businessCategory) {
        addRow('Detected Business Category', gbpAudit.businessCategory);
    }

    if (!summaryRowsHtml) {
        summaryRowsHtml = '<p>Audit completed successfully. Detailed findings are available on the website.</p>';
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333333; line-height: 1.6; margin: 0; padding: 0; background-color: #f9f9f9; }
    .email-container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; overflow: hidden; }
    .header { padding: 30px; text-align: center; color: #ffffff; }
    .header img { max-height: 50px; margin-bottom: 10px; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .card { background: #fdfdfd; border: 1px solid #f0f0f0; border-radius: 6px; padding: 20px; margin-bottom: 20px; }
    .card-title { font-size: 18px; font-weight: bold; margin-top: 0; color: #111111; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; margin-bottom: 15px; }
    .metric { margin-bottom: 12px; }
    .metric-name { font-weight: bold; color: #555555; }
    .metric-value { font-weight: bold; margin-left: 5px; }
    .status-pass { color: #2e7d32; }
    .status-fail { color: #d32f2f; }
    .status-warn { color: #ef6c00; }
    .btn { display: inline-block; padding: 12px 24px; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 15px; text-align: center; }
    .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="email-container" style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; overflow: hidden;">
    <div class="header" style="background-color: ${primaryColor}; padding: 30px; text-align: center; color: #ffffff;">
      ${logoHtml}
      <h1 style="margin: 0; font-size: 24px; color: #ffffff;">SEO Audit Report</h1>
    </div>
    <div class="content" style="padding: 30px;">
      <p>Hello,</p>
      <p>Here is the automated SEO audit report generated for <strong>${auditedUrl}</strong>.</p>
      
      <div class="card" style="background: #fdfdfd; border: 1px solid #f0f0f0; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
        <h2 class="card-title" style="font-size: 18px; font-weight: bold; margin-top: 0; color: #111111; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; margin-bottom: 15px;">Audit Summary</h2>
        ${summaryRowsHtml}
      </div>

      <p style="text-align: center; font-weight: bold; margin-top: 25px; margin-bottom: 5px;">Ready to claim these missing customers? Choose your path:</p>
      <div style="text-align: center; margin-top: 15px; margin-bottom: 25px;">
        <a href="https://www.localseogen.com/generate.html" class="btn" style="background-color: ${primaryColor}; color: #ffffff !important; display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; text-align: center; margin: 5px;">Generate 5 Pages Free</a>
        <a href="https://www.localseogen.com/pricing.html" class="btn" style="background-color: #10b981; color: #ffffff !important; display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; text-align: center; margin: 5px;">Get Pro Pack (200 pages) for $99</a>
      </div>
    </div>
    <div class="footer" style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0 0 10px 0;">Sent on behalf of ${agencyName}.</p>
      <p style="margin: 0;">Need help? Contact us at hello@localseogen.com or reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;
}

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { email, auditResults, url } = req.body;

        if (!email || !auditResults) {
            return res.status(400).json({ message: 'Email and audit results are required.' });
        }

        console.log('Received audit report request:');
        console.log('Email:', email);
        console.log('Audit Results:', JSON.stringify(auditResults, null, 2));

        const auditedUrl = url || 'your website';

        // Retrieve agency branding if requested
        const cookies = cookie.parse((req.headers && req.headers.cookie) || '');
        const token = cookies.authToken || cookies.token || cookies.auth;
        let agencyBranding = {
            name: 'LocalLeads',
            logoUrl: 'https://www.localseogen.com/images/logo.svg',
            primaryColor: '#007bff'
        };

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const agencyId = decoded.userId || decoded.agencyId;
                if (agencyId) {
                    const agencyResult = await query('SELECT name, logo_url, primary_color, is_agency FROM users WHERE id = $1', [agencyId]);
                    if (agencyResult.rows.length > 0 && agencyResult.rows[0].is_agency) {
                        const dbAgency = agencyResult.rows[0];
                        agencyBranding.name = dbAgency.name || agencyBranding.name;
                        agencyBranding.logoUrl = dbAgency.logo_url || agencyBranding.logoUrl;
                        agencyBranding.primaryColor = dbAgency.primary_color || agencyBranding.primaryColor;
                    }
                }
            } catch (err) {
                // Ignore token verification errors to fall back to default branding
            }
        }

        const emailHtml = buildAuditEmailHtml(auditedUrl, auditResults, agencyBranding);

        if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'mock') {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            const msg = {
                to: email,
                from: process.env.SENDGRID_FROM_EMAIL || 'hello@localseogen.com',
                subject: `SEO Audit Report for ${auditedUrl}`,
                html: emailHtml,
            };
            await sgMail.send(msg);
        } else {
            console.log('SendGrid API key not set, skipping real email send.');
        }

        res.status(200).json({ message: 'Audit report request received successfully.' });

    } catch (error) {
        console.error('Error in send-audit-report API:', error);
        await logError(error, 'Send Audit Report - General Error');
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

