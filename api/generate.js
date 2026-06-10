import { kv } from '@vercel/kv'; // Keep kv import for agency data
import { query } from '../db/index.js'; // Import PostgreSQL query utility
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';
import { logError } from '../lib/logger.js'; // Import centralized logger
import { submitSitemapToSearchEngines } from '../lib/indexing.js';
import { getFallbackMarketingCopy } from '../lib/fallback-copy.js';
import { parseOpeningHours } from '../lib/time-helpers.js';
import { getSchemaType } from '../lib/schema.js';
import { renderTestimonialsSection, generateSchemaReviews } from '../lib/testimonials-helper.js';

// Define the path to the page template
const templatePath = path.join(process.cwd(), 'page-template.html');

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
        await logError(aiError, `Error generating AI content for prompt: "${prompt.substring(0, 50)}..."`);
        return defaultValue;
    }
}

function generateLocalBusinessSchema(businessName, service, town, telephone, priceRange, openingHours, testimonials = []) {
    const schema = {
        "@context": "http://schema.org",
        "@type": getSchemaType(service),
        "name": businessName,
        "address": {
            "@type": "PostalAddress",
            "addressLocality": town,
        },
        "hasMap": `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName + ' ' + town)}`,
        "url": `https://www.localseogen.com/${slugify(service, { lower: true, strict: true })}-in-${slugify(town, { lower: true, strict: true })}.html`,
        "telephone": telephone || "",
        "priceRange": priceRange || "",
        "openingHoursSpecification": openingHours ? parseOpeningHours(openingHours) : [
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday"
                ],
                "opens": "09:00",
                "closes": "17:00"
            }
        ],
        "servesCuisine": service,
        "description": `Expert ${service} services in ${town} by ${businessName}.`,
        "image": "https://www.localseogen.com/images/logo.svg",
        "areaServed": {
            "@type": "State",
            "name": town
        }
    };

    if (testimonials && testimonials.length > 0) {
        const schemaReviews = generateSchemaReviews(testimonials);
        schema.review = schemaReviews.review;
        schema.aggregateRating = schemaReviews.aggregateRating;
    }

    return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
}

export default async (req, res) => {
    if (req.method === 'POST') {
        const { businessName, services, towns, zipCode, enableAICopy, 'ai-style': aiStyle, telephone, priceRange, openingHours, primaryColor } = req.body;

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
        const geminiModel = getGeminiModel();

        try {
            // Retrieve user from PostgreSQL
            const userResult = await query('SELECT id, credits, "agencyId" FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({ message: 'User not found. Please log in again.' });
            }
            const user = userResult.rows[0];

            // Fetch testimonials for the user
            const testimonialsResult = await query(
                'SELECT author_name, author_avatar, rating, review_text, review_date FROM testimonials WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            const testimonials = testimonialsResult.rows || [];
            const testimonialsSectionHtml = renderTestimonialsSection(testimonials);

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

            for (const town of townsArray) {
                for (const service of servicesArray) {
                    const escapedService = escapeHtml(service);
                    const escapedTown = escapeHtml(town);
                    const pageId = crypto.randomUUID();
                    const serviceSlug = slugify(service, { lower: true, strict: true });
                    const townSlug = slugify(town, { lower: true, strict: true });
                    const fileName = `${serviceSlug}-in-${townSlug}.html`;

                    let aiContent = '';
                    let metaDescription = '';
                    let ogDescription = '';
                    let twitterDescription = '';

                    if (enableAICopy && geminiModel) {
                        try {
                            const prompt = `Write 2-3 paragraphs of marketing copy in a ${aiStyle || 'professional'} tone for a business called "${escapedBusinessName}" that provides "${escapedService}" in "${escapedTown}". Focus on why a customer should choose them.`;
                            aiContent = await generateAIContent(geminiModel, prompt, getFallbackMarketingCopy(escapedBusinessName, escapedService, escapedTown));

                            const metaPrompt = `Write a concise and compelling meta description (around 150-160 characters) for a business called "${escapedBusinessName}" that offers "${escapedService}" in "${escapedTown}". Highlight key benefits and encourage clicks.`;
                            metaDescription = await generateAIContent(geminiModel, metaPrompt, `Find the best ${escapedService} services in ${escapedTown} with ${escapedBusinessName}. Quality service guaranteed.`);
                            if (metaDescription.length > 160) {
                                metaDescription = metaDescription.substring(0, 157) + '...';
                            } else if (metaDescription.length < 50) {
                                metaDescription = `Get expert ${escapedService} services in ${escapedTown} from ${escapedBusinessName}. Contact us today for a free quote!`;
                            }

                            const ogPrompt = `Craft an engaging Open Graph description (up to 200 characters) for a shared link about "${escapedBusinessName}'s ${escapedService} services in ${town}". Focus on attracting clicks on social media.`;
                            ogDescription = await generateAIContent(geminiModel, ogPrompt, `Discover ${escapedBusinessName}'s top-rated ${escapedService} services in ${escapedTown}. Click to learn more and get a free quote!`);
                            if (ogDescription.length > 200) {
                                ogDescription = ogDescription.substring(0, 197) + '...';
                            }

                            const twitterPrompt = `Write a compelling Twitter card description (up to 200 characters) for a tweet promoting "${escapedBusinessName}'s ${escapedService} services in ${escapedTown}". Encourage retweets and engagement.`;
                            twitterDescription = await generateAIContent(geminiModel, twitterPrompt, `Need ${escapedService} in ${escapedTown}? ${escapedBusinessName} offers reliable service. Get a free quote today! #${serviceSlug} #${townSlug}`);
                            if (twitterDescription.length > 200) {
                                twitterDescription = twitterDescription.substring(0, 197) + '...';
                            }
                        } catch (aiError) {
                            console.error('Error generating AI content:', aiError);
                            await logError(aiError, 'Generate API - AI Content Generation Error', 'generate_error.log');
                            aiContent = getFallbackMarketingCopy(escapedBusinessName, escapedService, escapedTown);
                            metaDescription = `Get expert ${escapedService} in ${escapedTown} from ${escapedBusinessName}. We provide top-quality ${escapedService} with reliable service. Contact us today for a free quote!`;
                            ogDescription = `Get expert ${escapedService} in ${escapedTown} from ${escapedBusinessName}. We provide top-quality ${escapedService} with reliable service. Contact us today for a free quote!`;
                            twitterDescription = `Get expert ${escapedService} in ${escapedTown} from ${escapedBusinessName}. We provide top-quality ${escapedService} with reliable service. Contact us today for a free quote!`;
                        }
                    } else {
                        aiContent = getFallbackMarketingCopy(escapedBusinessName, escapedService, escapedTown);
                        metaDescription = `Get expert ${escapedService} in ${escapedTown} from ${escapedBusinessName}. We provide top-quality ${escapedService} with reliable service. Contact us today for a free quote!`;
                        ogDescription = `Get expert ${escapedService} in ${escapedTown} from ${escapedBusinessName}. We provide top-quality ${escapedService} with reliable service. Contact us today for a free quote!`;
                        twitterDescription = `Get expert ${escapedService} in ${escapedTown} from ${escapedBusinessName}. We provide top-quality ${escapedService} with reliable service. Contact us today for a free quote!`;
                    }

                    const agencyLogoHtml = (agency && agency.logoUrl) ? `<img src="${escapeHtml(agency.logoUrl)}" alt="${escapeHtml(agency.agencyName)} Logo" style="max-height: 50px;" loading="lazy">` : escapedBusinessName; // Escape agency data
                    const primaryColorValue = escapeHtml(primaryColor || (agency && agency.primaryColor) || '#007bff');
                    const localBusinessSchema = generateLocalBusinessSchema(escapedBusinessName, escapedService, escapedTown, telephone, priceRange, openingHours, testimonials);

                    const resolvedPhone = escapeHtml(telephone || '');
                    const resolvedPriceRange = escapeHtml(priceRange || 'Standard');
                    const resolvedOpeningHours = escapeHtml(openingHours || 'Mo-Fr 09:00-17:00');
                    const phoneCtaDisplay = telephone ? 'inline-block' : 'none';

                    let pageContent = template
                        .replace(/{{businessName}}/g, escapedBusinessName)
                        .replace(/{{service}}/g, escapedService)
                        .replace(/{{town}}/g, escapedTown)
                        .replace(/{{agencyLogo}}/g, agencyLogoHtml)
                        .replace(/{{primaryColor}}/g, primaryColorValue)
                        .replace(/{{ai_content}}/g, aiContent)
                        .replace(/{{metaDescription}}/g, metaDescription)
                        .replace(/{{ogDescription}}/g, ogDescription)
                        .replace(/{{twitterDescription}}/g, twitterDescription)
                        .replace(/{{service_slug}}/g, serviceSlug)
                        .replace(/{{town_slug}}/g, townSlug)
                        .replace(/{{localBusinessSchema}}/g, localBusinessSchema)
                        .replace(/{{testimonialsSection}}/g, testimonialsSectionHtml)
                        .replace(/{{telephone}}/g, resolvedPhone)
                        .replace(/{{priceRange}}/g, resolvedPriceRange)
                        .replace(/{{openingHours}}/g, resolvedOpeningHours)
                        .replace(/{{phoneCtaDisplay}}/g, phoneCtaDisplay)
                        .replace(/{{pageId}}/g, pageId);


                    archive.append(pageContent, { name: fileName });

                    // Store page in database
                    const pageSlug = `${userId}-${serviceSlug}-in-${townSlug}`;
                    await query(
                        `INSERT INTO seo_pages (id, file_name, slug, content, user_id, business_name, service, town, zip_code, telephone, price_range, opening_hours, enable_ai_copy, ai_style)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                         ON CONFLICT (slug) DO UPDATE SET 
                           content = EXCLUDED.content,
                           business_name = EXCLUDED.business_name,
                           service = EXCLUDED.service,
                           town = EXCLUDED.town,
                           zip_code = EXCLUDED.zip_code,
                           telephone = EXCLUDED.telephone,
                           price_range = EXCLUDED.price_range,
                           opening_hours = EXCLUDED.opening_hours,
                           enable_ai_copy = EXCLUDED.enable_ai_copy,
                           ai_style = EXCLUDED.ai_style,
                           updated_at = CURRENT_TIMESTAMP`,
                        [
                            pageId,
                            fileName,
                            pageSlug,
                            pageContent,
                            userId,
                            escapedBusinessName,
                            escapedService,
                            escapedTown,
                            zipCode,
                            telephone || null,
                            priceRange || null,
                            openingHours || null,
                            enableAICopy || false,
                            aiStyle || null
                        ]
                    );
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

            // Trigger automated search engine sitemap registration and indexing pings
            await submitSitemapToSearchEngines(userId, req);

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
