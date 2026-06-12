import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-pro' });
}

function getFallbackSocialPosts(authorName, reviewText, rating, businessName, service, town) {
  const loc = town ? ` in ${town}` : "";
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const ratingText = rating >= 4 ? `${rating}-star experience` : `review`;
  const emoji = rating >= 4 ? `🌟` : `📝`;
  
  const googleUpdate = `New customer feedback! ${emoji} "${reviewText}" - ${authorName}. We are committed to providing top-quality ${service} services${loc}. Need help with your next project? Get in touch today!`;
  
  const facebookPost = `Thank you so much to ${authorName} for taking the time to share their feedback with us! ${rating >= 4 ? '🙌' : '❤️'}\n\n"${reviewText}" (${stars})\n\nAt ${businessName}, we're always dedicated to delivering the best ${service} work${loc}. Contact us today to learn how we can help you!\n\n#${businessName.replace(/[^a-zA-Z0-9]/g, '')} #${service.replace(/[^a-zA-Z0-9]/g, '')}${town ? ' #' + town.replace(/[^a-zA-Z0-9]/g, '') : ''} #CustomerFeedback #LocalBusiness`;

  return { googleUpdate, facebookPost };
}

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
    return res.status(401).json({ message: 'Not authenticated. Please log in.' });
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId || decoded.agencyId;
    if (!userId) {
      return res.status(400).json({ message: 'Invalid token payload' });
    }
  } catch (error) {
    await logError(error, 'Social Post Generation - Token Verification Failed');
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  const { reviewId, authorName: bodyAuthorName, reviewText: bodyReviewText, rating: bodyRating } = req.body;
  
  let authorName, reviewText, rating;

  try {
    if (reviewId) {
      const result = await query(
        'SELECT author_name, review_text, rating FROM testimonials WHERE id = $1 AND user_id = $2',
        [reviewId, userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Review not found.' });
      }
      authorName = result.rows[0].author_name;
      reviewText = result.rows[0].review_text;
      rating = parseInt(result.rows[0].rating, 10);
    } else {
      authorName = bodyAuthorName;
      reviewText = bodyReviewText;
      rating = bodyRating ? parseInt(bodyRating, 10) : 5;
    }

    if (!authorName || !reviewText) {
      return res.status(400).json({ message: 'Missing review details. Author name and review text are required.' });
    }

    let businessName = req.body.businessName;
    let service = req.body.service;
    let town = req.body.town;

    if (!businessName || !service || !town) {
      const pagesResult = await query(
        'SELECT business_name, service, town FROM seo_pages WHERE user_id = $1 LIMIT 1',
        [userId]
      );
      if (pagesResult.rows.length > 0) {
        businessName = businessName || pagesResult.rows[0].business_name;
        service = service || pagesResult.rows[0].service || 'local services';
        town = town || pagesResult.rows[0].town || '';
      }
    }
    businessName = businessName || 'Our Business';
    service = service || 'services';
    town = town || '';

    const geminiModel = getGeminiModel();
    if (!geminiModel) {
      const fallback = getFallbackSocialPosts(authorName, reviewText, rating, businessName, service, town);
      return res.status(200).json({ posts: fallback, source: 'fallback' });
    }

    const prompt = `You are a local marketing and copywriting expert.
Generate two optimized social media posts based on the following customer review:
Customer Name: "${authorName}"
Rating: ${rating} out of 5 stars
Review Content: "${reviewText}"

Business Name: "${businessName}"
Service Offered: "${service}"
Location: "${town}"

Please output exactly two social media posts:
1. "googleUpdate": A post optimized for Google Business Profile Updates (formerly GMB posts). It must be professional, highly localized, keyword-rich, concise (max 300 characters), incorporate a short quote or highlight from the customer's review, and include a clear call to action to visit the website/call.
2. "facebookPost": A post optimized for Facebook. It must be warm, friendly, engaging, include emojis, highlight the customer review, and include 3-5 relevant local hashtags (e.g. #${businessName.replace(/[^a-zA-Z0-9]/g, '')}, #${town.replace(/[^a-zA-Z0-9]/g, '')}, #CustomerReview), and a warm call to action.

Return your output as a raw JSON object with the following structure:
{
  "googleUpdate": "the Google Business Profile post text",
  "facebookPost": "the Facebook post text"
}

Ensure your output is valid, raw JSON. Do not surround the JSON with markdown code blocks (e.g. do not use \`\`\`json) or any additional text.`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text().trim();
      
      const cleanJsonText = responseText
        .replace(/^```json\s*/i, '')
        .replace(/```$/, '')
        .trim();

      const posts = JSON.parse(cleanJsonText);
      if (posts && posts.googleUpdate && posts.facebookPost) {
        return res.status(200).json({ posts, source: 'ai' });
      } else {
        throw new Error('Parsed object does not contain expected properties.');
      }
    } catch (aiError) {
      await logError(aiError, 'Gemini failed to generate social posts, using fallback.');
      const fallback = getFallbackSocialPosts(authorName, reviewText, rating, businessName, service, town);
      return res.status(200).json({ posts: fallback, source: 'fallback' });
    }
  } catch (error) {
    await logError(error, 'Social Post Generation Error');
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
