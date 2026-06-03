import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import slugify from 'slugify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logError } from '../lib/logger.js';
import { getFallbackMarketingCopy } from '../lib/fallback-copy.js';
import { submitSitemapToSearchEngines } from '../lib/indexing.js';

function getGeminiModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-pro' });
}

async function generateAIContent(geminiModel, prompt, defaultValue) {
    if (!geminiModel) return defaultValue;
    try {
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (aiError) {
        await logError(aiError, `Update Page API - Error generating AI content for prompt: "${prompt.substring(0, 50)}..."`);
        return defaultValue;
    }
}

export default async function handler(req, res, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const cookies = parse(req.headers.cookie || '');
    const token = cookies.authToken;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        await logError(error, 'Update Page - JWT Verification Error', 'update_page_error.log');
        return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }

    const userId = decoded.userId;
    const {
        pageId,
        businessName,
        service,
        town,
        zipCode,
        telephone,
        priceRange,
        openingHours,
        enableAICopy,
        aiStyle
    } = req.body;

    if (!pageId || !businessName || !service || !town || !zipCode) {
        return res.status(400).json({ message: 'Missing required fields: pageId, businessName, service, town, zipCode' });
    }

    try {
        const pageDataString = await currentKv.get(pageId);
        if (!pageDataString) {
            return res.status(404).json({ message: 'Page not found.' });
        }

        const pageData = typeof pageDataString === 'string' ? JSON.parse(pageDataString) : pageDataString;

        // Verify ownership
        if (pageData.userId !== userId) {
            return res.status(403).json({ message: 'Unauthorized. You do not own this page.' });
        }

        const escapeHtml = (str) => {
            if (typeof str !== 'string') return str;
            return str.replace(/[&<>"']/g, (match) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[match]));
        };

        const escapedBusinessName = escapeHtml(businessName);
        const escapedService = escapeHtml(service);
        const escapedTown = escapeHtml(town);

        // Update values
        pageData.businessName = escapedBusinessName;
        pageData.service = escapedService;
        pageData.town = escapedTown;
        pageData.zipCode = zipCode;
        pageData.telephone = telephone || null;
        pageData.priceRange = priceRange || null;
        pageData.openingHours = openingHours || null;
        pageData.enableAICopy = enableAICopy || false;
        pageData.aiStyle = aiStyle || null;
        pageData.updatedAt = new Date().toISOString();

        // Save updated pageData back to KV
        await currentKv.set(pageId, JSON.stringify(pageData));

        // Submit updated sitemap
        try {
            await submitSitemapToSearchEngines(userId, req);
        } catch (sitemapError) {
            await logError(sitemapError, 'Update Page - Sitemap Submit Error', 'update_page_error.log');
        }

        return res.status(200).json({ message: 'Page updated successfully.', page: pageData });
    } catch (error) {
        await logError(error, 'Update Page - General Error', 'update_page_error.log');
        return res.status(500).json({ message: 'Internal server error.' });
    }
}
