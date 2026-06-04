import { query } from '../db/index.js';
import { kv } from '@vercel/kv';
import { logError, logInfo } from '../lib/logger.js';
import { sendEmail } from '../lib/email.js';
import slugify from 'slugify';
import { sendSmsNotification } from '../lib/sms.js';

export default async (req, res, currentKvClient) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const currentKv = currentKvClient || kv;
    const { pageId, name, email, phone, message, url } = req.body;

    if (!pageId || !name || !email) {
        return res.status(400).json({ message: 'Missing required fields: pageId, name, email.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    try {
        let userId = null;
        let businessName = '';
        let service = '';
        let town = '';

        // 1. Try to find the page metadata in PostgreSQL (seo_pages)
        if (pageId) {
            try {
                const pageResult = await query(
                    'SELECT user_id, business_name, service, town FROM seo_pages WHERE id = $1',
                    [pageId]
                );
                if (pageResult.rows.length > 0) {
                    const row = pageResult.rows[0];
                    userId = row.user_id;
                    businessName = row.business_name;
                    service = row.service;
                    town = row.town;
                }
            } catch (err) {
                await logError(err, 'Failed to query page data from PostgreSQL in submit-lead by pageId');
            }
        }

        // 2. If not found by ID (or generated statically via api/generate-seo-pages.js), try to query by slug/url
        if (!userId) {
            let slug = '';
            if (url) {
                const filename = url.split('/').pop() || '';
                slug = filename.replace('.html', '');
            }

            if (slug) {
                try {
                    const pageResult = await query(
                        'SELECT user_id, business_name, service, town FROM seo_pages WHERE slug = $1 OR file_name = $2',
                        [slug, `${slug}.html`]
                    );
                    if (pageResult.rows.length > 0) {
                        const row = pageResult.rows[0];
                        userId = row.user_id;
                        businessName = row.business_name;
                        service = row.service;
                        town = row.town;
                    }
                } catch (err) {
                    await logError(err, 'Failed to query page data from PostgreSQL in submit-lead by slug');
                }
            }
        }

        if (!userId) {
            await logError(new Error(`User not found for pageId: ${pageId}, url: ${url}`), 'Lead Submission - User Not Found');
            return res.status(404).json({ message: 'Page owner not found. Lead cannot be submitted.' });
        }

        // 3. Save lead to PostgreSQL leads table
        const insertLeadResult = await query(
            `INSERT INTO leads (name, email, phone, message, user_id, page_id, url, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [name, email, phone || null, message || null, userId, pageId, url || null, 'landing_page']
        );
        const leadId = insertLeadResult.rows[0].id;
        await logInfo(`Lead ${leadId} stored successfully for user ${userId}.`, 'Lead Submission');

        // 4. Retrieve user's email and package details to see if they are a paying customer
        const userResult = await query('SELECT email, is_agency, subscription_status, webhook_url, webhook_enabled, sms_enabled, sms_phone FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(200).json({ message: 'Lead submitted successfully.' }); 
        }
        const user = userResult.rows[0];
        const ownerEmail = user.email;

        // Check if user has paid
        let isPaidUser = false;
        if (user.is_agency || user.subscription_status === 'active') {
            isPaidUser = true;
        } else {
            // Check credit transactions in KV
            const transactions = await currentKv.lrange(`user:${userId}:credittransactions`, 0, -1) || [];
            isPaidUser = transactions.some(t => {
                try {
                    const trans = JSON.parse(t);
                    return trans.amount > 0;
                } catch {
                    return false;
                }
            });
        }

        // 5. Send notification email to the business owner
        const subject = `New Lead from LocalLeads: ${name}`;
        let htmlContent = '';

        if (isPaidUser) {
            htmlContent = `
                <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h2 style="color: #2563eb; margin-top: 0;">🎉 New Lead Received!</h2>
                    <p>You have received a new contact submission on your generated landing page:</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: bold; width: 30%;">Name:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Email:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;"><a href="mailto:${email}">${email}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Phone:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${phone ? `<a href="tel:${phone}">${phone}</a>` : 'Not provided'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Message:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">${message || 'No message left.'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Page URL:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;"><a href="${url}">${url || 'View Page'}</a></td>
                        </tr>
                    </table>
                    <p style="margin-top: 20px; font-size: 0.9rem; color: #6b7280;">Log in to your dashboard at <a href="https://www.localseogen.com/dashboard.html">LocalLeads</a> to manage all your leads.</p>
                </div>
            `;
        } else {
            const obscuredEmail = email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c);
            const obscuredPhone = phone ? phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4) : 'Not provided';
            
            htmlContent = `
                <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #fafafa;">
                    <h2 style="color: #2563eb; margin-top: 0;">🎉 New Lead Received!</h2>
                    <p>Good news! Someone is interested in your services and filled out the form on your LocalLeads page.</p>
                    
                    <div style="background: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #f0f0f0; margin: 15px 0;">
                        <h4 style="margin-top: 0; color: #374151;">Lead Details Preview:</h4>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> <span style="background: #eee; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${obscuredEmail}</span></p>
                        <p><strong>Phone:</strong> <span style="background: #eee; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${obscuredPhone}</span></p>
                        <p><strong>Message:</strong> <em>"${message || 'Interested in a quote'}"</em></p>
                    </div>

                    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; text-align: center; margin-top: 20px;">
                        <h3 style="margin-top: 0; color: #1e3a8a;">🔒 Unlock This Lead</h3>
                        <p style="color: #1e40af; font-size: 0.95rem; margin-bottom: 20px;">
                            You are currently on the Free Trial. Upgrade your LocalLeads account to a paid plan (starting at just $49) to instantly reveal this lead's contact details and receive full details for all future leads.
                        </p>
                        <a href="https://www.localseogen.com/pricing.html" style="background: #2563eb; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">
                            Upgrade & Unlock Lead Now
                        </a>
                    </div>
                </div>
            `;
        }

        await sendEmail(ownerEmail, subject, htmlContent);

        // 5b. Send SMS notification if configured, user is paid, and sms is enabled
        if (isPaidUser && user.sms_enabled && user.sms_phone) {
            try {
                const smsBody = `LocalLeads: New lead from ${name}! Email: ${email}. Phone: ${phone || 'Not provided'}. Message: ${message || 'No message left.'}`;
                sendSmsNotification(user.sms_phone, smsBody).catch(smsErr => {
                    console.error('Error in SMS delivery:', smsErr);
                });
            } catch (smsErr) {
                console.error('Error triggering SMS notification:', smsErr);
            }
        }

        // 6. Trigger webhook notification if configured and user is paid
        if (isPaidUser && user.webhook_enabled && user.webhook_url) {
            try {
                const webhookPayload = {
                    event: 'lead.captured',
                    lead: {
                        id: leadId,
                        name: name,
                        email: email,
                        phone: phone || null,
                        message: message || null,
                        url: url || null,
                        source: 'landing_page',
                        createdAt: new Date().toISOString(),
                        metadata: {
                            businessName: businessName,
                            service: service,
                            town: town
                        }
                    }
                };

                // Perform non-blocking webhook dispatch
                fetch(user.webhook_url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'LocalLeads-Webhook/1.0'
                    },
                    body: JSON.stringify(webhookPayload)
                }).catch(fetchErr => {
                    console.error('Error in webhook fetch delivery:', fetchErr);
                });
            } catch (webhookErr) {
                console.error('Error triggering webhook:', webhookErr);
            }
        }

        return res.status(200).json({ message: 'Lead submitted successfully.' });

    } catch (error) {
        await logError(error, 'Error in submit-lead endpoint');
        return res.status(500).json({ message: 'Internal Server Error. Could not submit lead.' });
    }
};
