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

function getFallbackKeywords(service, town) {
  const s = service.trim();
  const t = town.trim();
  return [
    {
      query: `${s} in ${t}`,
      intent: 'Transactional',
      volume: 'High',
      explanation: 'Primary high-intent search query used by customers ready to purchase.'
    },
    {
      query: `best ${s} ${t}`,
      intent: 'Commercial',
      volume: 'High',
      explanation: 'Used by customers comparing local options before selecting a provider.'
    },
    {
      query: `affordable ${s} ${t}`,
      intent: 'Commercial',
      volume: 'Medium',
      explanation: 'Price-sensitive customers looking for cost-effective local solutions.'
    },
    {
      query: `${t} ${s} services`,
      intent: 'Transactional',
      volume: 'High',
      explanation: 'General local search query targets commercial intent landing pages.'
    },
    {
      query: `emergency ${s} ${t}`,
      intent: 'Transactional',
      volume: 'Medium',
      explanation: 'High urgency query from customers requiring immediate local assistance.'
    },
    {
      query: `local ${s} company ${t}`,
      intent: 'Commercial',
      volume: 'Medium',
      explanation: 'Users seeking established local businesses and trust factors.'
    },
    {
      query: `${s} cost in ${t}`,
      intent: 'Informational',
      volume: 'Medium',
      explanation: 'Customers researching average prices and planning their budget.'
    },
    {
      query: `recommended ${s} near me`,
      intent: 'Transactional',
      volume: 'High',
      explanation: 'Proximity-based query targeting local service area radius directly.'
    }
  ];
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
      userId = decoded.userId;
    } catch (error) {
      await logError(error, 'Keyword Research - Token Verification Failed');
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
  }

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const { service, town } = req.body;
  if (!service || !town) {
    return res.status(400).json({ message: 'Missing required fields: service and town.' });
  }

  try {
    const geminiModel = getGeminiModel();
    if (!geminiModel) {
      // Use deterministic fallback if API key is not configured
      const fallback = getFallbackKeywords(service, town);
      return res.status(200).json({ keywords: fallback, source: 'fallback' });
    }

    const prompt = `Generate a list of 8 highly relevant, high-intent local search queries (keywords) that potential customers might search on Google for "${service}" in "${town}". For each query, estimate the search intent (e.g. Transactional, Informational, Commercial) and a relative search volume scale (High, Medium, Low). 
Return the result as a raw JSON array containing objects with properties: "query" (string), "intent" (string), "volume" (string), and "explanation" (string explaining why it is valuable).
Do not output any markdown code blocks or text explanations around the JSON. Output only the raw JSON.`;

    try {
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text().trim();
      
      // Clean up potential markdown wrappers
      const cleanJsonText = responseText
        .replace(/^```json\s*/i, '')
        .replace(/```$/, '')
        .trim();

      const keywords = JSON.parse(cleanJsonText);
      if (Array.isArray(keywords)) {
        return res.status(200).json({ keywords, source: 'ai' });
      } else {
        throw new Error('Response is not an array.');
      }
    } catch (aiError) {
      await logError(aiError, 'Gemini failed to suggest keywords, using fallback.');
      const fallback = getFallbackKeywords(service, town);
      return res.status(200).json({ keywords: fallback, source: 'fallback' });
    }
  } catch (error) {
    await logError(error, 'Keyword Research - General Error');
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
