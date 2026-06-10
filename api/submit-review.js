import { query } from '../db/index.js';
import { logError, logInfo } from '../lib/logger.js';
import { sendSmsNotification } from '../lib/sms.js';
import { kv } from '@vercel/kv';

export default async (req, res, currentKvClient) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const currentKv = currentKvClient || kv;
    const { clientId, authorName, rating, reviewText, reviewDate } = req.body;

    if (!clientId || !authorName || !rating || !reviewText) {
        return res.status(400).json({ message: 'Missing required fields: clientId, authorName, rating, reviewText.' });
    }

    const userIdNum = parseInt(clientId, 10);
    if (isNaN(userIdNum)) {
        return res.status(400).json({ message: 'Invalid clientId.' });
    }

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
    }

    const rDate = reviewDate ? new Date(reviewDate) : new Date();

    try {
        // Verify user exists
        const userResult = await query('SELECT email, is_agency, subscription_status, webhook_url, webhook_enabled, sms_enabled, sms_phone, name FROM users WHERE id = $1', [userIdNum]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Business not found.' });
        }
        const user = userResult.rows[0];

        // Insert testimonial
        const result = await query(
            'INSERT INTO testimonials (user_id, author_name, rating, review_text, review_date) VALUES ($1, $2, $3, $4, $5) RETURNING id, author_name, rating, review_text, review_date',
            [userIdNum, authorName, ratingNum, reviewText, rDate]
        );

        const newReview = result.rows[0];
        await logInfo(`Public review submitted successfully for business ${userIdNum}. Review ID: ${newReview.id}`, 'Submit Review');

        // Check if user has paid
        let isPaidUser = false;
        if (user.is_agency || user.subscription_status === 'active') {
            isPaidUser = true;
        } else {
            // Check credit transactions in KV
            const transactions = await currentKv.lrange(`user:${userIdNum}:credittransactions`, 0, -1) || [];
            isPaidUser = transactions.some(t => {
                try {
                    const trans = JSON.parse(t);
                    return trans.amount > 0;
                } catch {
                    return false;
                }
            });
        }

        // SMS notification if configured and paid
        if (isPaidUser && user.sms_enabled && user.sms_phone) {
            try {
                const stars = '★'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);
                const smsBody = `LocalLeads: New review from ${authorName}! Rating: ${stars} (${ratingNum}/5). "${reviewText.substring(0, 80)}${reviewText.length > 80 ? '...' : ''}"`;
                sendSmsNotification(user.sms_phone, smsBody).catch(smsErr => {
                    console.error('Error in Review SMS delivery:', smsErr);
                });
            } catch (smsErr) {
                console.error('Error triggering Review SMS notification:', smsErr);
            }
        }

        // Webhook notification if configured and paid
        if (isPaidUser && user.webhook_enabled && user.webhook_url) {
            try {
                const webhookPayload = {
                    event: 'review.created',
                    review: {
                        id: newReview.id,
                        authorName: newReview.author_name,
                        rating: newReview.rating,
                        reviewText: newReview.review_text,
                        reviewDate: newReview.review_date,
                        businessName: user.name
                    },
                    timestamp: new Date().toISOString()
                };

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                fetch(user.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(webhookPayload),
                    signal: controller.signal
                }).then(async (webRes) => {
                    clearTimeout(timeoutId);
                    if (!webRes.ok) {
                        console.error(`Review Webhook dispatch failed: ${webRes.status} ${webRes.statusText}`);
                    }
                }).catch(webErr => {
                    clearTimeout(timeoutId);
                    console.error('Review Webhook connection failed:', webErr);
                });
            } catch (webErr) {
                console.error('Error dispatching Review Webhook:', webErr);
            }
        }

        return res.status(201).json({
            message: 'Review submitted successfully',
            testimonial: newReview
        });
    } catch (error) {
        await logError(error, 'Public Submit Review Error');
        return res.status(500).json({ message: 'Internal server error.' });
    }
};
