import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';
import { getValidAccessToken } from '../lib/gbp-helper.js';

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-pro' });
}

function getFallbackRecommendations(businessName, service, town, addressText, phone, website) {
  const city = town || 'your local area';
  const bizName = businessName || 'our business';
  const svc = service || 'local services';
  
  const keywords = [
    `${svc} in ${city}`,
    `best ${svc} near me`,
    `emergency ${svc} ${city}`,
    `affordable ${svc} company`,
    `${bizName} ${city}`
  ];

  const optimizedDescription = `Are you looking for reliable, professional ${svc} in ${city}? At ${bizName}, we specialize in top-rated ${svc} designed to meet all your needs. With years of experience serving the ${city} community, our dedicated team is committed to providing outstanding service, fast response times, and exceptional workmanship. Whether it is routine maintenance or an urgent service call, we have you covered. Contact us at ${phone || 'our phone number'} or visit our website to get a free estimate today!`;

  const posts = [
    {
      title: 'Local Update',
      text: `Need professional ${svc} in ${city}? The team at ${bizName} is here to help! We provide fast, reliable, and high-quality services across the region. Check out our website to learn more or give us a call today! #LocalBusiness #${svc.replace(/\s+/g, '')} #${city.replace(/\s+/g, '')}`
    },
    {
      title: 'Special Offer',
      text: `Special offer for ${city} residents! Get a discount on our top-rated ${svc} this week. Contact ${bizName} today and mention this Google update to claim your estimate. Don't wait - book now! #${city.replace(/\s+/g, '')} #SpecialOffer #LocalPromo`
    },
    {
      title: 'Did You Know?',
      text: `Regular maintenance of your property can save you thousands in future repairs. At ${bizName}, we help homeowners keep their systems running smoothly. Call us today to schedule your checkup! #HomeMaintenance #PropertyCare #${svc.replace(/\s+/g, '')}`
    }
  ];

  const faqs = [
    {
      question: `What areas do you serve for ${svc}?`,
      answer: `We proudly serve ${city} and all surrounding neighborhoods. If you are unsure if we cover your area, feel free to give us a call!`
    },
    {
      question: `Do you offer emergency services in ${city}?`,
      answer: `Yes, we offer emergency callouts for urgent issues. Contact us directly at ${phone || 'our number'} for immediate assistance.`
    },
    {
      question: `How do I request a quote or estimate?`,
      answer: `You can request an estimate by calling us directly or filling out the contact form on our website: ${website || 'localseogen.com'}.`
    },
    {
      question: `What types of ${svc} do you specialize in?`,
      answer: `We specialize in a wide range of residential and commercial ${svc}. Our services are tailored to ensure safety, efficiency, and customer satisfaction.`
    },
    {
      question: `Are your technicians licensed and insured?`,
      answer: `Absolutely! All our technicians are fully licensed, insured, and background-checked to provide you with peace of mind and top-quality service.`
    }
  ];

  return { keywords, optimizedDescription, posts, faqs };
}

export default async function handler(req, res) {
  // Set CORS headers
  if (res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { isMock, name, address, phone, website, category, description } = req.body;

  let userId = null;
  let gbpConnected = false;
  let profile = {
    name: name || '',
    address: address || '',
    phone: phone || '',
    website: website || '',
    category: category || '',
    description: description || '',
    reviewsCount: 0,
    reviewsAverage: 0,
    responseRate: 0
  };

  // If this is NOT a public mock scan, authenticate and fetch user details
  if (!isMock) {
    const cookies = cookie.parse(req.headers.cookie || '');
    let token = cookies.authToken || cookies.token || cookies.auth;

    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret_key_for_testing');
      userId = decoded.userId || decoded.agencyId;
      if (!userId) {
        return res.status(400).json({ message: 'Invalid token payload' });
      }
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    try {
      // Fetch user profile from database
      const userResult = await query(
        'SELECT business_profile, gbp_oauth_refresh_token, gbp_oauth_access_token, gbp_account_id, gbp_location_id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const user = userResult.rows[0];
      gbpConnected = !!(user.gbp_oauth_refresh_token && user.gbp_oauth_access_token);

      // Parse business profile
      const bp = user.business_profile ? (typeof user.business_profile === 'string' ? JSON.parse(user.business_profile) : user.business_profile) : null;
      if (bp) {
        profile.name = bp.name || '';
        profile.phone = bp.phone || '';
        profile.website = bp.website || '';
        profile.category = bp.type || '';
        profile.description = bp.description || '';
        if (bp.address) {
          profile.address = [bp.address.streetAddress, bp.address.addressLocality, bp.address.addressRegion, bp.address.postalCode].filter(Boolean).join(', ');
        }
      }

      // Try to fetch reviews statistics to calculate response rate
      const reviewsResult = await query(
        'SELECT rating, reply_text FROM testimonials WHERE user_id = $1',
        [userId]
      );

      if (reviewsResult.rows.length > 0) {
        profile.reviewsCount = reviewsResult.rows.length;
        const totalRating = reviewsResult.rows.reduce((sum, r) => sum + parseInt(r.rating || 5, 10), 0);
        profile.reviewsAverage = parseFloat((totalRating / profile.reviewsCount).toFixed(1));

        const repliedCount = reviewsResult.rows.filter(r => r.reply_text && r.reply_text.trim() !== '').length;
        profile.responseRate = Math.round((repliedCount / profile.reviewsCount) * 100);
      } else {
        // Fallback default mock stats for connected profile without testimonials
        profile.reviewsCount = 8;
        profile.reviewsAverage = 4.4;
        profile.responseRate = 25; // 2 out of 8 replied
      }

    } catch (dbErr) {
      await logError(dbErr, 'GBP Audit DB Fetch Error');
      return res.status(500).json({ message: 'Failed to retrieve profile data.' });
    }
  } else {
    // For public scans, mock some stats
    profile.reviewsCount = name ? (name.length % 15) + 3 : 5;
    profile.reviewsAverage = name ? parseFloat((4.0 + (name.length % 10) / 10).toFixed(1)) : 4.2;
    profile.responseRate = name ? (name.length % 3 === 0 ? 80 : 40) : 50;
  }

  // Perform checks
  const checks = [];
  let scorePoints = 0;
  const maxPoints = 100;

  // 1. Business Name (10 points)
  const hasName = !!(profile.name && profile.name.trim() !== '');
  checks.push({
    id: 'name',
    title: 'Business Name',
    status: hasName ? 'passed' : 'failed',
    message: hasName ? 'Business name is properly configured.' : 'Business name is missing.',
    impact: 'Critical'
  });
  if (hasName) scorePoints += 10;

  // 2. Business Category (15 points)
  const hasCategory = !!(profile.category && profile.category.trim() !== '');
  checks.push({
    id: 'category',
    title: 'Primary Category',
    status: hasCategory ? 'passed' : 'failed',
    message: hasCategory ? `Primary category set to "${profile.category}".` : 'No primary business category defined.',
    impact: 'High'
  });
  if (hasCategory) scorePoints += 15;

  // 3. Address (15 points)
  const hasAddress = !!(profile.address && profile.address.trim() !== '');
  checks.push({
    id: 'address',
    title: 'Business Address / Service Area',
    status: hasAddress ? 'passed' : 'failed',
    message: hasAddress ? 'Physical address or service area is configured.' : 'No physical address or service area specified.',
    impact: 'High'
  });
  if (hasAddress) scorePoints += 15;

  // 4. Phone Number (15 points)
  const hasPhone = !!(profile.phone && profile.phone.trim() !== '');
  checks.push({
    id: 'phone',
    title: 'Telephone Number',
    status: hasPhone ? 'passed' : 'failed',
    message: hasPhone ? `Phone number is configured (${profile.phone}).` : 'No phone number listed. Customers cannot call you directly from search.',
    impact: 'High'
  });
  if (hasPhone) scorePoints += 15;

  // 5. Website URL (15 points)
  const hasWebsite = !!(profile.website && profile.website.trim() !== '');
  const isSecureWeb = hasWebsite && profile.website.toLowerCase().startsWith('https');
  checks.push({
    id: 'website',
    title: 'Website Link',
    status: hasWebsite ? (isSecureWeb ? 'passed' : 'warning') : 'failed',
    message: hasWebsite 
      ? (isSecureWeb ? 'Website link is configured and secure (HTTPS).' : 'Website link is configured but uses unsecure HTTP.') 
      : 'No website link configured. Lose out on valuable click-through traffic.',
    impact: 'High'
  });
  if (hasWebsite) scorePoints += isSecureWeb ? 15 : 10;

  // 6. Description (15 points)
  const descLen = profile.description ? profile.description.trim().length : 0;
  const hasDesc = descLen > 0;
  const isDescOptimized = descLen >= 250 && descLen <= 750;
  checks.push({
    id: 'description',
    title: 'Business Description',
    status: hasDesc ? (isDescOptimized ? 'passed' : 'warning') : 'failed',
    message: hasDesc
      ? (isDescOptimized ? `Optimized description length (${descLen} characters).` : `Description is present but too short (${descLen} chars). Recommend 250-750 characters for keyword optimization.`)
      : 'No business description. Missing opportunity to tell customers and search engines what you do.',
    impact: 'Medium'
  });
  if (hasDesc) scorePoints += isDescOptimized ? 15 : 10;

  // 7. Review Activity (15 points)
  const hasReviews = profile.reviewsCount >= 10;
  const hasGoodRating = profile.reviewsAverage >= 4.5;
  const hasGoodResponse = profile.responseRate >= 80;
  checks.push({
    id: 'reviews',
    title: 'Review Presence & Responses',
    status: (hasReviews && hasGoodResponse) ? 'passed' : 'warning',
    message: `Profile has ${profile.reviewsCount} reviews (avg rating: ${profile.reviewsAverage}★) with a ${profile.responseRate}% response rate. ${profile.responseRate < 80 ? 'Recommend replying to at least 80% of reviews to signal activity to Google.' : ''}`,
    impact: 'Medium'
  });
  if (profile.reviewsCount > 0) {
    let reviewPoints = 5;
    if (hasReviews) reviewPoints += 5;
    if (hasGoodResponse) reviewPoints += 5;
    scorePoints += reviewPoints;
  }

  const score = Math.min(Math.round((scorePoints / maxPoints) * 100), 100);

  // Extract town and service for AI prompt
  let town = '';
  if (profile.address) {
    const addrParts = profile.address.split(',');
    town = addrParts.length >= 2 ? addrParts[addrParts.length - 2].trim() : profile.address.trim();
  }

  // Attempt to generate recommendations with Gemini
  const geminiModel = getGeminiModel();
  let recommendations = null;

  if (geminiModel) {
    const prompt = `You are a Google Business Profile (GBP) Local SEO optimization expert.
    Analyze this business:
    Name: "${profile.name}"
    Category: "${profile.category || 'Local Business'}"
    Location: "${town || 'Local Area'}"
    Phone: "${profile.phone}"
    Website: "${profile.website}"
    Current Description: "${profile.description || ''}"

    Generate:
    1. A list of 5 optimized local SEO search keywords.
    2. An optimized GBP business description incorporating these keywords (must be between 300 and 700 characters, persuasive, clear CTA).
    3. 3 local update post ideas (short, localized, engaging, with hashtag suggestions).
    4. 5 proactive Q&A FAQs (Frequently Asked Questions & Answers) to add to their GBP profile to answer customers and target local keywords.

    Return the result as a raw JSON object with the following structure:
    {
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "optimizedDescription": "The full optimized description text...",
      "posts": [
        { "title": "Post 1 Title", "text": "Post 1 text with hashtags..." },
        { "title": "Post 2 Title", "text": "Post 2 text..." },
        { "title": "Post 3 Title", "text": "Post 3 text..." }
      ],
      "faqs": [
        { "question": "Question 1?", "answer": "Answer 1..." },
        { "question": "Question 2?", "answer": "Answer 2..." },
        { "question": "Question 3?", "answer": "Answer 3..." },
        { "question": "Question 4?", "answer": "Answer 4..." },
        { "question": "Question 5?", "answer": "Answer 5..." }
      ]
    }

    Ensure your output is valid, raw JSON. Do not surround the JSON with markdown code blocks (do not use \`\`\`json) or any additional text.`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text().trim();
      
      const cleanJsonText = responseText
        .replace(/^```json\s*/i, '')
        .replace(/```$/, '')
        .trim();

      recommendations = JSON.parse(cleanJsonText);
    } catch (aiErr) {
      await logError(aiErr, 'GBP Audit - Gemini failed, falling back.');
    }
  }

  // Fallback to programmatic generator if Gemini failed or is not available
  if (!recommendations) {
    recommendations = getFallbackRecommendations(
      profile.name,
      profile.category,
      town,
      profile.address,
      profile.phone,
      profile.website
    );
  }

  // Return audit results
  return res.status(200).json({
    score,
    profile,
    checks,
    recommendations,
    gbpConnected,
    isMock: !!isMock
  });
}
