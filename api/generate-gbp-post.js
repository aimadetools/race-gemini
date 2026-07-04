import { GoogleGenerativeAI } from '@google/generative-ai';
import { logError } from '../lib/logger.js';

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-pro' });
}

function getDeterministicPost(businessName, service, location, postType, tone, keywords, specialDetails) {
  const bName = businessName.trim();
  const sName = service.trim();
  const loc = location.trim();
  const kwList = keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
  const kwPhrase = kwList.length > 0 ? `Specialize in ${kwList.join(', ')}.` : '';

  let postText = '';
  let buttonLabel = 'Learn More';

  if (postType === 'offer') {
    const title = specialDetails?.offerTitle || `Special Promotion`;
    const discount = specialDetails?.discountDetails || `discount on services`;
    const code = specialDetails?.couponCode ? `Use coupon code: ${specialDetails.couponCode}` : '';
    const start = specialDetails?.startDate || 'today';
    const end = specialDetails?.endDate || 'limited time';
    
    buttonLabel = 'Get Offer';

    if (tone === 'promotional') {
      postText = `🚨 LIMITED TIME OFFER: ${title}! 🚨\n\nNeed expert ${sName} in ${loc}? ${bName} is offering a special promotion: ${discount}! ${kwPhrase} ${code ? '🔑 ' + code : ''}\n\nDon't miss out on these savings. Active from ${start} to ${end}. Click below to claim your offer and schedule your appointment today! 👇`;
    } else if (tone === 'helpful') {
      postText = `💡 Looking to get your ${sName} sorted in ${loc}? Here is a great opportunity. ${bName} is running a special offer: ${title}. Get ${discount} to help keep your property in top shape! ${code ? 'Coupon: ' + code : ''}\n\nValid from ${start} until ${end}. Reach out if you have any questions or book now!`;
    } else {
      postText = `Announcement: ${title} from ${bName}.\n\nWe are pleased to offer our clients in ${loc} a special promotion on ${sName} services. Details: ${discount}. ${kwPhrase} ${code ? 'Offer Code: ' + code : ''}\n\nTerm: ${start} - ${end}. Please contact us or visit our website to secure this offer.`;
    }
  } else if (postType === 'event') {
    const title = specialDetails?.eventTitle || `Community Service Day`;
    const start = specialDetails?.startDate || 'soon';
    const end = specialDetails?.endDate || '';
    const dateRange = end ? `${start} to ${end}` : start;
    
    buttonLabel = 'Sign Up';

    if (tone === 'promotional') {
      postText = `🎉 Upcoming Event: ${title} in ${loc}! 🎉\n\nJoin the team at ${bName} for our upcoming event. If you are interested in ${sName}, this is the perfect event for you! ${kwPhrase}\n\n📅 Date: ${dateRange}\n📍 Location: ${loc}\n\nSpaces are limited! Click below to sign up and secure your spot today! 🚀`;
    } else if (tone === 'helpful') {
      postText = `📅 Mark Your Calendar: ${title} in ${loc}.\n\nAt ${bName}, we believe in keeping our local community informed. We are hosting a special session on ${sName} topics. We will discuss best practices and answer your questions.\n\nDate: ${dateRange}\nLocation: ${loc}\n\nClick below to learn more and RSVP!`;
    } else {
      postText = `Event Invitation: ${title} hosted by ${bName}.\n\nWe invite you to attend our upcoming local event in ${loc} focusing on ${sName} solutions. ${kwPhrase}\n\nSchedule: ${dateRange}\nVenue: ${loc}\n\nTo register for the event, please select the button below.`;
    }
  } else {
    // Default: What's New / Update
    const customText = specialDetails?.customAnnouncement ? `\n\n${specialDetails.customAnnouncement}` : '';

    if (tone === 'promotional') {
      postText = `🔥 Top-Rated ${sName} in ${loc}! 🔥\n\nLooking for the best local ${sName} service? The team at ${bName} has you covered! We pride ourselves on fast response times, exceptional workmanship, and affordable rates. ${kwPhrase}${customText}\n\nDon't settle for less. Contact the local experts today for a free quote! 📞`;
      buttonLabel = 'Call Now';
    } else if (tone === 'helpful') {
      postText = `🛠️ Quick Tip: Keep your property in top condition with professional ${sName} in ${loc}.\n\nRegular checkups can help prevent costly emergency repairs down the road. The experienced team at ${bName} is here to assist with all your ${sName} maintenance needs. ${kwPhrase}${customText}\n\nRead our guide or book a visit today by clicking below!`;
      buttonLabel = 'Learn More';
    } else {
      postText = `We are proud to offer professional ${sName} services to businesses and homeowners throughout ${loc}. At ${bName}, we prioritize safety, quality, and complete customer satisfaction. ${kwPhrase}${customText}\n\nFor more details or to schedule a service, visit our site or call our team today.`;
      buttonLabel = 'Learn More';
    }
  }

  return { postText, buttonLabel, isAi: false };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { businessName, service, location, postType, tone, keywords, specialDetails } = req.body;

  if (!businessName || !service || !location) {
    return res.status(400).json({ message: 'Missing required fields: businessName, service, and location.' });
  }

  try {
    const geminiModel = getGeminiModel();
    if (!geminiModel) {
      const fallback = getDeterministicPost(businessName, service, location, postType, tone, keywords, specialDetails);
      return res.status(200).json({ ...fallback, source: 'fallback' });
    }

    const typeDesc = postType === 'offer' ? 'Special Offer / Deal' : postType === 'event' ? 'Event Announcement' : 'General Update / News ("What\'s New")';
    let prompt = `You are a professional local SEO copywriter and expert in crafting Google Business Profile (formerly GMB) updates. 
Generate a highly engaging, localized, search-optimized Google Business Profile post with the following details:
- Business Name: "${businessName}"
- Core Service Category: "${service}"
- Target Geographic Location: "${location}"
- Post Type: "${typeDesc}"
- Tone of Voice: "${tone || 'professional'}"
${keywords ? `- Keywords to naturally integrate: "${keywords}"` : ''}

`;

    if (postType === 'offer') {
      prompt += `Details for this offer:
- Title: "${specialDetails?.offerTitle || 'Limited Deal'}"
- Discount Details: "${specialDetails?.discountDetails || ''}"
- Coupon Code (if any): "${specialDetails?.couponCode || 'N/A'}"
- Start Date: "${specialDetails?.startDate || 'today'}"
- End Date: "${specialDetails?.endDate || 'limited time'}"
Write an exciting promotional offer post. Keep it structured and clear. Give it a high click-through rate.
`;
    } else if (postType === 'event') {
      prompt += `Details for this event:
- Event Title: "${specialDetails?.eventTitle || 'Community Event'}"
- Start Date/Time: "${specialDetails?.startDate || ''}"
- End Date/Time: "${specialDetails?.endDate || ''}"
Write a compelling event invitation. Keep readers excited to join.
`;
    } else {
      prompt += `Custom Announcement details (if any): "${specialDetails?.customAnnouncement || ''}"
Write a high-quality local announcement update.
`;
    }

    prompt += `
Constraints:
- Google Business Profile posts should be between 200 and 500 characters for optimal visibility, with a hard limit of 1000 characters. Keep it concise, punchy, and highly relevant.
- Include 1-3 emojis to draw attention.
- Incorporate the keywords naturally without keyword-stuffing.
- Include a clear implied call to action at the end.
- Suggest the best Google Business Profile call-to-action button label (options: "Learn More", "Get Offer", "Sign Up", "Call Now", "Book").

Return your output as a raw JSON object with exactly two keys:
1. "postText": "the fully generated post text content"
2. "buttonLabel": "one of the suggested button labels"

Do not surround the JSON with markdown code blocks (\`\`\`json) or any additional text. Return only the raw JSON.`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text().trim();
      
      const cleanJsonText = responseText
        .replace(/^```json\s*/i, '')
        .replace(/```$/, '')
        .trim();

      const data = JSON.parse(cleanJsonText);
      if (data && data.postText && data.buttonLabel) {
        return res.status(200).json({
          postText: data.postText,
          buttonLabel: data.buttonLabel,
          isAi: true,
          source: 'ai'
        });
      } else {
        throw new Error('Invalid JSON structure returned by Gemini.');
      }
    } catch (aiError) {
      await logError(aiError, 'Gemini failed to generate GBP post, using fallback.');
      const fallback = getDeterministicPost(businessName, service, location, postType, tone, keywords, specialDetails);
      return res.status(200).json({ ...fallback, source: 'fallback' });
    }

  } catch (error) {
    await logError(error, 'GBP Post API General Error');
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
