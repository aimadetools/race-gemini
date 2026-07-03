import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const cookies = cookie.parse(req.headers.cookie || '');
  let token = cookies.authToken || cookies.token || cookies.auth;

  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId || decoded.agencyId;
    if (!userId) {
      return res.status(400).json({ message: 'Invalid token payload' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const { reviewText, rating, authorName, tone } = req.body;
  if (rating === undefined || rating === null) {
    return res.status(400).json({ message: 'Review rating is required.' });
  }

  const ratingNum = parseInt(rating, 10);
  const reviewer = authorName || 'there';

  try {
    // 1. Fetch business details
    const userResult = await query(
      'SELECT email, phone, business_profile FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    let businessName = "Local Services";
    let service = "home services";
    let town = "";
    let email = user.email;
    let phone = user.phone || "";

    const bp = user.business_profile ? (typeof user.business_profile === 'string' ? JSON.parse(user.business_profile) : user.business_profile) : null;
    if (bp) {
      businessName = bp.name || businessName;
      phone = bp.phone || phone;
      email = bp.email || email;
      if (bp.address) {
        town = bp.address.addressLocality || "";
      }
    }

    // Try to get service and town from seo_pages if not set
    if (!town || service === "home services") {
      const pagesResult = await query(
        'SELECT business_name, service, town FROM seo_pages WHERE user_id = $1 LIMIT 1',
        [userId]
      );
      if (pagesResult.rows.length > 0) {
        businessName = pagesResult.rows[0].business_name || businessName;
        if (service === "home services") {
          service = pagesResult.rows[0].service || service;
        }
        if (!town) {
          town = pagesResult.rows[0].town || town;
        }
      }
    }

    // Prepare response options
    const replies = [];

    const townPhrase = town ? ` in ${town}` : '';
    const servicePhrase = service ? ` ${service}` : ' services';
    const selectedTone = tone || 'Enthusiastic';

    if (ratingNum >= 4) {
      // Positive reviews
      if (selectedTone === 'Formal') {
        replies.push({
          id: 'formal_seo',
          label: 'Formal & Localized (SEO)',
          text: `Dear ${reviewer}, thank you for taking the time to share your feedback. The team at ${businessName} remains dedicated to delivering exemplary${servicePhrase}${townPhrase}. We appreciate your support and look forward to serving you in the future.`
        });

        replies.push({
          id: 'formal_standard',
          label: 'Formal Thank You',
          text: `We sincerely appreciate your positive review, ${reviewer}. It was our pleasure to assist you with your${servicePhrase} requirements${townPhrase}. Please do not hesitate to contact ${businessName} for any future needs.`
        });

        replies.push({
          id: 'formal_executive',
          label: 'Executive Summary',
          text: `Thank you for your high rating, ${reviewer}. The team at ${businessName} is pleased to hear that our${servicePhrase} met your expectations${townPhrase}. We value your business.`
        });
      } else if (selectedTone === 'Humorous') {
        replies.push({
          id: 'humorous_seo',
          label: 'Humorous & Localized (SEO)',
          text: `Hey ${reviewer}, they say money can't buy happiness, but it can buy top-notch${servicePhrase}${townPhrase} from ${businessName}, which is pretty close! Thanks for the awesome review!`
        });

        replies.push({
          id: 'humorous_casual',
          label: 'Witty & Playful',
          text: `Rumor has it that ${businessName} has the best customers in town, and reviews like yours, ${reviewer}, prove it! Thanks for letting us handle your${servicePhrase}${townPhrase}. You rock!`
        });

        replies.push({
          id: 'humorous_short',
          label: 'Short & Cheeky',
          text: `5 stars? You have excellent taste, ${reviewer}! Thanks for choosing ${businessName} for your${servicePhrase} needs${townPhrase}.`
        });
      } else {
        // Enthusiastic & Friendly (Default)
        replies.push({
          id: 'professional',
          label: 'Professional & Localized (SEO)',
          text: `Hi ${reviewer}, thank you so much for the feedback! The team at ${businessName} is proud to provide top-rated${servicePhrase}${townPhrase}. We really appreciate your recommendation and look forward to helping you again next time!`
        });

        replies.push({
          id: 'casual',
          label: 'Warm & Friendly',
          text: `Thank you for sharing your experience, ${reviewer}! It was a pleasure working with you on your${servicePhrase} project${townPhrase ? ' here' + townPhrase : ''}. Feel free to reach out to us at ${businessName} if you ever need anything else. Have a great day!`
        });

        replies.push({
          id: 'short',
          label: 'Short & Punchy',
          text: `Thanks for the 5-star review, ${reviewer}! We are glad we could help with your${servicePhrase} needs${townPhrase}. - The ${businessName} team.`
        });
      }
    } else {
      // Neutral/Negative reviews
      const contactInfo = [phone, email].filter(Boolean).join(' or ');
      const contactPhrase = contactInfo ? ` Please contact us directly at ${contactInfo} so we can resolve this for you.` : ' Please reach out to our team directly so we can make this right.';

      if (selectedTone === 'Formal') {
        replies.push({
          id: 'formal_recovery',
          label: 'Formal Recovery (SEO)',
          text: `Dear ${reviewer}, thank you for your feedback. We maintain strict standards at ${businessName} regarding our${servicePhrase}${townPhrase}, and we regret that your experience did not reflect this. We wish to address your concerns immediately.${contactPhrase}`
        });

        replies.push({
          id: 'formal_inquiry',
          label: 'Formal Inquiry',
          text: `Dear ${reviewer}, we appreciate your review. We take all customer concerns seriously at ${businessName} as we continuously evaluate our${servicePhrase} in the ${town || 'local'} area.${email ? ' Please contact us via email at ' + email + ' to discuss this matter further.' : ' Please contact our administrative office.'}`
        });

        replies.push({
          id: 'formal_apology',
          label: 'Formal Apology',
          text: `Dear ${reviewer}, we apologize that your experience with ${businessName} did not meet your expectations. We value your feedback on our${servicePhrase} and would appreciate a chance to discuss this further. Please contact us. Thank you.`
        });
      } else if (selectedTone === 'Humorous') {
        replies.push({
          id: 'casual_recovery',
          label: 'Friendly Recovery (SEO)',
          text: `Hi ${reviewer}, thanks for the honest feedback. We always aim for a perfect score at ${businessName} with our${servicePhrase}${townPhrase}, so we are bummed to hear we missed the mark. We'd love to make it up to you!${contactPhrase}`
        });

        replies.push({
          id: 'casual_inquiry',
          label: 'Casual Inquiry',
          text: `Hi ${reviewer}, we appreciate the feedback. We want to do better next time for our${servicePhrase} customers here in ${town || 'town'}. Let's chat so we can fix this.${email ? ' Hit us up at ' + email + ' and let us know what happened.' : ' Please reach out to us.'}`
        });

        replies.push({
          id: 'casual_apology',
          label: 'Direct Apology',
          text: `Hey ${reviewer}, we're sorry things didn't go smoothly with ${businessName}. We value your input on our${servicePhrase} and want to get this sorted out. Please get in touch so we can make things right. Thanks!`
        });
      } else {
        // Enthusiastic & Friendly (Default)
        replies.push({
          id: 'recovery',
          label: 'Customer Recovery (SEO)',
          text: `Hi ${reviewer}, thank you for sharing your feedback. We hold ourselves to high standards at ${businessName} for our${servicePhrase}${townPhrase}, and we are sorry to hear your experience wasn't perfect. We would love the chance to make this right.${contactPhrase}`
        });

        replies.push({
          id: 'inquiry',
          label: 'Professional Inquiry',
          text: `Hi ${reviewer}, we appreciate you taking the time to write a review. We take all feedback seriously at ${businessName} as we strive to improve our${servicePhrase} work in the ${town || 'local'} area.${email ? ' Please reach out to us at ' + email + ' so we can get more details and improve.' : ' Please reach out to our office to discuss this.'}`
        });

        replies.push({
          id: 'short_apology',
          label: 'Short Apology',
          text: `Hello ${reviewer}, we apologize that your experience with ${businessName} did not meet your expectations. We value your feedback on our${servicePhrase} and would appreciate a chance to discuss this further. Please contact us. Thank you.`
        });
      }
    }

    return res.status(200).json({ replies });
  } catch (error) {
    await logError(error, 'Generate Review Reply Error');
    return res.status(500).json({ message: 'Internal server error. Could not generate replies.' });
  }
}
