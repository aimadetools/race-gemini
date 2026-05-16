import { kv } from '@vercel/kv'; // Keep kv import for agency data
import { query } from '../db/index.js'; // Import PostgreSQL query utility
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';
import { logError } from '../../lib/logger.js'; // Import centralized logger

// Define the path to the page template
const templatePath = path.join(process.cwd(), 'page-template.html');

let geminiApiKey = process.env.GEMINI_API_KEY;
let genAI;
let geminiModel;

if (geminiApiKey) {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
} else {
    console.warn('GEMINI_API_KEY is not set. AI copy generation will be skipped.');
}

export default async (req, res) => {
    if (req.method === 'POST') {
        const { businessName, services, towns, zipCode, enableAICopy, 'ai-style': aiStyle } = req.body;

        if (!businessName || !services || !towns || !zipCode) {
            await logError(new Error('Missing required fields'), 'Generate API - Missing Fields', 'generate_error.log');
            return res.status(400).json({ message: 'Missing required fields' });
        }

        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.userId;
            } catch (error) {
                if (error.name === 'TokenExpiredError') {
                    await logError(error, 'Generate API - Token Expired', 'generate_error.log');
                    return res.status(401).json({ message: 'Authorization failed: Token expired.' });
                } else if (error.name === 'JsonWebTokenError') {
                    await logError(error, 'Generate API - Invalid Token', 'generate_error.log');
                    return res.status(401).json({ message: 'Authorization failed: Invalid token.' });
                }
                await logError(error, 'Generate API - Token Verification Failed', 'generate_error.log');
                return res.status(401).json({ message: 'Authorization failed: Please log in again.' });
            }
        } else {
            await logError(new Error('Authorization token not provided'), 'Generate API - No Token', 'generate_error.log');
            return res.status(401).json({ message: 'Authorization required: No token provided.' });
        }

        const servicesArray = services.split(',').map(s => s.trim());
        const townsArray = towns.split(',').map(t => t.trim());
        const pagesToGenerate = servicesArray.length * townsArray.length;

        try {
            // Retrieve user from PostgreSQL
            const userResult = await query('SELECT id, credits, "agencyId" FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({ message: 'User not found. Please log in again.' });
            }
            const user = userResult.rows[0];

            if (user.credits < pagesToGenerate) {
                return res.status(402).json({ message: `Insufficient credits. You need ${pagesToGenerate} credits but only have ${user.credits}. Please buy more credits.` });
            }

            let agency = null;
            if (user.agencyId) {
                // Assuming agency data still lives in KV for now, as it's a separate concern.
                const agencyData = await kv.get(`agency:${user.agencyId}`);
                if (agencyData) {
                    agency = JSON.parse(agencyData);
                }
            }

            let template;
            try {
                template = fs.readFileSync(templatePath, 'utf8');
            } catch (error) {
                console.error('Error reading page template:', error); // Keep console.error here for template loading
                await logError(error, 'Generate API - Template Read Error', 'generate_error.log'); // Add centralized logging
                return res.status(500).json({ message: 'Error loading page template.' });
            }

            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="localleads-pages.zip"'
            });

            const archive = archiver('zip', {
                zlib: { level: 9 }
            });

            archive.pipe(res);

            // XSS mitigation for user-supplied data
            const escapeHtml = (str) => {
                if (typeof str !== 'string') return str;
                return str.replace(/[&<>"']/g, function(match) {
                    return {
                        '&': '&amp;',
                        '<': '&lt;',
                        '>': '&gt;',
                        '"': '&quot;',
                        "'": '&#039;'
                    }[match];
                });
            };

            const escapedBusinessName = escapeHtml(businessName);
            const escapedService = escapeHtml(service);
            const escapedTown = escapeHtml(town);

            for (const town of townsArray) {
                for (const service of servicesArray) {
                    const pageId = `page:${Date.now()}${Math.random()}`; // Unique ID for each page
                    const serviceSlug = slugify(service, { lower: true, strict: true });
                    const townSlug = slugify(town, { lower: true, strict: true });
                    const fileName = `${serviceSlug}-in-${townSlug}.html`;

                    let aiContent = '';
                    if (enableAICopy && geminiModel) {
                        try {
                            const prompt = `Write 2-3 paragraphs of marketing copy in a ${aiStyle || 'professional'} tone for a business called "${escapedBusinessName}" that provides "${escapedService}" in "${escapedTown}". Focus on why a customer should choose them.`;
                            const result = await geminiModel.generateContent(prompt);
                            const response = await result.response;
                            aiContent = escapeHtml(response.text()); // Escape AI generated content
                        } catch (aiError) {
                            console.error('Error generating AI content:', aiError);
                            await logError(aiError, 'Generate API - AI Content Generation Error', 'generate_error.log'); // Add centralized logging
                            aiContent = escapeHtml('<p>AI copy generation failed. Please try again later or contact support.</p>'); // Escape fallback
                        }
                    } else if (enableAICopy && !geminiModel) {
                        aiContent = escapeHtml('<p>AI copy is unavailable due to missing API key. Contact support.</p>'); // Escape fallback
                    } else {
                        aiContent = escapeHtml('<p>Contact us today for a free estimate!</p>'); // Escape fallback
                    }

                    const agencyLogoHtml = (agency && agency.logoUrl) ? `<img src="${escapeHtml(agency.logoUrl)}" alt="${escapeHtml(agency.agencyName)} Logo" style="max-height: 50px;">` : escapedBusinessName; // Escape agency data
                    const primaryColorValue = (agency && agency.primaryColor) ? escapeHtml(agency.primaryColor) : '#007bff'; // Escape color if it can be user controlled

                    let pageContent = template
                        .replace(/{{businessName}}/g, escapedBusinessName)
                        .replace(/{{service}}/g, escapedService)
                        .replace(/{{town}}/g, escapedTown)
                        .replace(/{{agencyLogo}}/g, agencyLogoHtml)
                        .replace(/{{primaryColor}}/g, primaryColorValue)
                        .replace(/{{ai_content}}/g, aiContent)
                        .replace(/{{service_slug}}/g, serviceSlug)
                        .replace(/{{town_slug}}/g, townSlug);
                    // pageId is used for tracking and should not be injected directly into the HTML
                    // If it needs to be in the HTML, add a specific placeholder for it in the template
                    // For now, removing direct replacement here to avoid unintended exposure.


                    archive.append(pageContent, { name: fileName });

                    // Store page metadata
                    await currentKv.set(pageId, JSON.stringify({
                        businessName: escapedBusinessName, // Store escaped values
                        service: escapedService,
                        town: escapedTown,
                        zipCode, // Zip code is numeric, no escaping needed here
                        createdAt: new Date().toISOString(),
                        enableAICopy: enableAICopy || false,
                        aiStyle: aiStyle || null,
                        userId: user.id
                    }));
                    await currentKv.sadd(`user:${userId}:pages`, pageId);
                }
            }

            // Decrement user credits in PostgreSQL
            await query('UPDATE users SET credits = credits - $1 WHERE id = $2', [pagesToGenerate, userId]);

            // Log credit transaction
            const transaction = {
                date: new Date().toISOString(),
                description: `Generated ${pagesToGenerate} SEO pages`,
                amount: -pagesToGenerate
            };
            await kv.lpush(`user:${userId}:credittransactions`, JSON.stringify(transaction));

            archive.finalize();

        } catch (error) {
            console.error('Error generating pages:', error); // Keep console.error for general unexpected error
            await logError(error, 'Generate API - General Error', 'generate_error.log'); // Add centralized logging
            return res.status(500).json({ message: 'Error generating pages' });
        }

    } else {
        res.status(405).send('Method Not Allowed');
    }
};
