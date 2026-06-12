import { GoogleGenerativeAI } from '@google/generative-ai';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { logError } from '../lib/logger.js';

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-pro' });
}

function getFallbackSchemaDetails(businessName, serviceType, city, state = '') {
  const s = serviceType.trim();
  const b = businessName.trim();
  const location = state ? `${city.trim()}, ${state.trim()}` : city.trim();
  
  return {
    description: `Expert ${s} services provided by ${b} in ${location}. We offer reliable, high-quality, and prompt local service.`,
    services: [
      { name: `Residential ${s}`, description: `Professional residential ${s} installation, maintenance, and repair services in ${location}.` },
      { name: `Commercial ${s}`, description: `Reliable commercial ${s} systems setup, inspections, and customized solutions for businesses.` },
      { name: `Emergency ${s} Service`, description: `Fast-response emergency ${s} troubleshooting and repairs available in the ${location} region.` },
      { name: `${s} Inspection & Diagnostics`, description: `Thorough inspection, diagnostics, and preventative care for all ${s} setups.` }
    ],
    suggestedHours: [
      { dayOfWeek: "Monday", opens: "08:00", closes: "17:00" },
      { dayOfWeek: "Tuesday", opens: "08:00", closes: "17:00" },
      { dayOfWeek: "Wednesday", opens: "08:00", closes: "17:00" },
      { dayOfWeek: "Thursday", opens: "08:00", closes: "17:00" },
      { dayOfWeek: "Friday", opens: "08:00", closes: "17:00" },
      { dayOfWeek: "Saturday", opens: "09:00", closes: "14:00" }
    ]
  };
}

export default async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const cookies = parse(req.headers.cookie || '');
  const token = cookies.authToken;
  let userId = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId || decoded.agencyId;
    } catch (error) {
      await logError(error, 'Schema Details Generation - Token Verification Failed');
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
  }

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const { businessName, serviceType, city, state } = req.body;
  if (!businessName || !serviceType || !city) {
    return res.status(400).json({ message: 'Missing required fields: businessName, serviceType, city.' });
  }

  try {
    const geminiModel = getGeminiModel();
    if (!geminiModel) {
      const fallback = getFallbackSchemaDetails(businessName, serviceType, city, state);
      return res.status(200).json({ details: fallback, source: 'fallback' });
    }

    const location = state ? `${city.trim()}, ${state.trim()}` : city.trim();
    const prompt = `You are a local SEO expert. Write an optimized local business schema description and services catalog for a company with the following details:
Business Name: "${businessName}"
Service Type: "${serviceType}"
Location: "${location}"

Generate:
1. A concise, keyword-rich business description (max 150 characters) designed for SEO schema.
2. A list of 4 core local service offerings, each with a brief title and a 1-sentence localized description.
3. A standard set of weekly operating hours (Monday to Friday, and optionally Saturday).

Return your output as a raw JSON object with the following structure:
{
  "description": "the business description string",
  "services": [
    { "name": "service name 1", "description": "localized service description" },
    ...
  ],
  "suggestedHours": [
    { "dayOfWeek": "Monday", "opens": "08:00", "closes": "17:00" },
    ...
  ]
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

      const details = JSON.parse(cleanJsonText);
      if (details && details.description && Array.isArray(details.services)) {
        return res.status(200).json({ details, source: 'ai' });
      } else {
        throw new Error('Parsed object does not contain expected properties.');
      }
    } catch (aiError) {
      await logError(aiError, 'Gemini failed to suggest schema details, using fallback.');
      const fallback = getFallbackSchemaDetails(businessName, serviceType, city, state);
      return res.status(200).json({ details: fallback, source: 'fallback' });
    }
  } catch (error) {
    await logError(error, 'Schema Details Generation - General Error');
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
