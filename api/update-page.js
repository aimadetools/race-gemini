import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import slugify from 'slugify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { logError } from '../lib/logger.js';
import { getFallbackMarketingCopy } from '../lib/fallback-copy.js';
import { submitSitemapToSearchEngines } from '../lib/indexing.js';
import { query } from '../db/index.js';
import { getSchemaType } from '../lib/schema.js';
import { parseOpeningHours } from '../lib/time-helpers.js';
import { renderTestimonialsSection, generateSchemaReviews } from '../lib/testimonials-helper.js';

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
        aiStyle,
        aiKeywords,
        primaryColor
    } = req.body;

    if (!pageId || !businessName || !service || !town || !zipCode) {
        return res.status(400).json({ message: 'Missing required fields: pageId, businessName, service, town, zipCode' });
    }

    try {
        const pageResult = await query(
            'SELECT id, user_id, file_name, slug FROM seo_pages WHERE id = $1',
            [pageId]
        );
        if (pageResult.rows.length === 0) {
            return res.status(404).json({ message: 'Page not found.' });
        }

        const pageRow = pageResult.rows[0];

        // Verify ownership
        if (pageRow.user_id !== userId) {
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

        // Fetch client and their parent agency from PostgreSQL to compile template
        const clientResult = await query('SELECT id, name, email, agency_id FROM users WHERE id = $1', [userId]);
        const client = clientResult.rows[0];
        let logoUrl = null;
        let primaryColorValue = primaryColor || '#007bff';
        let agencyName = '';

        if (!primaryColor && client.agency_id) {
            const agencyResult = await query('SELECT name, logo_url, primary_color FROM users WHERE id = $1', [client.agency_id]);
            if (agencyResult.rows.length > 0) {
                const agency = agencyResult.rows[0];
                logoUrl = agency.logo_url || null;
                primaryColorValue = agency.primary_color || '#007bff';
                agencyName = agency.name || '';
            }
        } else if (client.agency_id) {
            const agencyResult = await query('SELECT name, logo_url FROM users WHERE id = $1', [client.agency_id]);
            if (agencyResult.rows.length > 0) {
                const agency = agencyResult.rows[0];
                logoUrl = agency.logo_url || null;
                agencyName = agency.name || '';
            }
        }

        let template;
        try {
            template = fs.readFileSync(path.join(process.cwd(), 'page-template.html'), 'utf8');
        } catch (error) {
            console.error('Error reading page template:', error);
            await logError(error, 'Update Page - Template Read Error', 'update_page_error.log');
            return res.status(500).json({ message: 'Error loading page template.' });
        }

        const resolvedServiceSlug = slugify(escapedService, { lower: true, strict: true });
        const resolvedTownSlug = slugify(escapedTown, { lower: true, strict: true });

        // Fetch testimonials for the user
        const testimonialsResult = await query(
            'SELECT author_name, author_avatar, rating, review_text, review_date FROM testimonials WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        const testimonials = testimonialsResult.rows || [];
        const testimonialsSectionHtml = renderTestimonialsSection(testimonials);

        const geminiModel = getGeminiModel();

        let aiContent = '';
        let metaDescription = '';
        let ogDescription = '';
        let twitterDescription = '';

        if (enableAICopy && geminiModel) {
            try {
                let prompt = `Write 2-3 paragraphs of marketing copy in a ${aiStyle || 'professional'} tone for a business called "${escapedBusinessName}" that provides "${escapedService}" in "${escapedTown}". Focus on why a customer should choose them.`;
                if (aiKeywords) {
                    prompt += ` Incorporate the following keywords/instructions: ${aiKeywords}.`;
                }
                aiContent = await generateAIContent(geminiModel, prompt, getFallbackMarketingCopy(escapedBusinessName, escapedService, escapedTown));

                const metaPrompt = `Write a concise and compelling meta description (around 150-160 characters) for a business called "${escapedBusinessName}" that offers "${escapedService}" in "${escapedTown}". Highlight key benefits and encourage clicks.`;
                metaDescription = await generateAIContent(geminiModel, metaPrompt, `Find the best ${escapedService} services in ${escapedTown} with ${escapedBusinessName}. Quality service guaranteed.`);
                if (metaDescription.length > 160) {
                    metaDescription = metaDescription.substring(0, 157) + '...';
                } else if (metaDescription.length < 50) {
                    metaDescription = `Get expert ${escapedService} services in ${escapedTown} from ${escapedBusinessName}. Contact us today for a free quote!`;
                }

                const ogPrompt = `Craft an engaging Open Graph description (up to 200 characters) for a shared link about "${escapedBusinessName}'s ${escapedService} services in ${escapedTown}". Focus on attracting clicks on social media.`;
                ogDescription = await generateAIContent(geminiModel, ogPrompt, `Discover ${escapedBusinessName}'s top-rated ${escapedService} services in ${escapedTown}. Click to learn more and get a free quote!`);
                if (ogDescription.length > 200) {
                    ogDescription = ogDescription.substring(0, 197) + '...';
                }

                const twitterPrompt = `Write a compelling Twitter card description (up to 200 characters) for a tweet promoting "${escapedBusinessName}'s ${escapedService} services in ${escapedTown}". Encourage retweets and engagement.`;
                twitterDescription = await generateAIContent(geminiModel, twitterPrompt, `Need ${escapedService} in ${escapedTown}? ${escapedBusinessName} offers reliable service. Get a free quote today! #${resolvedServiceSlug} #${resolvedTownSlug}`);
                if (twitterDescription.length > 200) {
                    twitterDescription = twitterDescription.substring(0, 197) + '...';
                }
            } catch (aiError) {
                console.error('Error generating AI content:', aiError);
                await logError(aiError, 'Update Page - AI Content Generation Error', 'update_page_error.log');
                aiContent = getFallbackMarketingCopy(escapedBusinessName, escapedService, escapedTown);
                metaDescription = `Get expert ${escapedService} in ${escapedTown} from ${escapedBusinessName}. We provide top-quality ${escapedService} with reliable service. Contact us today for a free quote!`;
                ogDescription = metaDescription;
                twitterDescription = metaDescription;
            }
        } else {
            aiContent = getFallbackMarketingCopy(escapedBusinessName, escapedService, escapedTown);
            metaDescription = `Get expert ${escapedService} in ${escapedTown} from ${escapedBusinessName}. We provide top-quality ${escapedService} with reliable service. Contact us today for a free quote!`;
            ogDescription = metaDescription;
            twitterDescription = metaDescription;
        }

        const localBusinessSchema = generateLocalBusinessSchema(escapedBusinessName, escapedService, escapedTown, telephone, priceRange, openingHours, testimonials);

        const agencyLogoHtml = logoUrl ? `<img src="${logoUrl}" alt="${agencyName} Logo" style="max-height: 50px;" loading="lazy">` : escapedBusinessName;

        const resolvedPhone = telephone || '';
        const resolvedPriceRange = priceRange || 'Standard';
        const resolvedOpeningHours = openingHours || 'Mo-Fr 09:00-17:00';
        const phoneCtaDisplay = telephone ? 'inline-block' : 'none';

        let pageContent = template
            .replace(/{{businessName}}/g, escapedBusinessName)
            .replace(/{{service}}/g, escapedService)
            .replace(/{{town}}/g, escapedTown)
            .replace(/{{metaDescription}}/g, metaDescription)
            .replace(/{{ogDescription}}/g, ogDescription)
            .replace(/{{twitterDescription}}/g, twitterDescription)
            .replace(/{{primaryColor}}/g, primaryColorValue)
            .replace(/{{agencyLogo}}/g, agencyLogoHtml)
            .replace(/{{ai_content}}/g, aiContent)
            .replace(/{{service_slug}}/g, resolvedServiceSlug)
            .replace(/{{town_slug}}/g, resolvedTownSlug)
            .replace(/{{localBusinessSchema}}/g, localBusinessSchema)
            .replace(/{{testimonialsSection}}/g, testimonialsSectionHtml)
            .replace(/{{telephone}}/g, resolvedPhone)
            .replace(/{{priceRange}}/g, resolvedPriceRange)
            .replace(/{{openingHours}}/g, resolvedOpeningHours)
            .replace(/{{phoneCtaDisplay}}/g, phoneCtaDisplay)
            .replace(/{{pageId}}/g, pageId);

        // Update database record
        await query(
            `UPDATE seo_pages 
             SET content = $1, 
                 business_name = $2, 
                 service = $3, 
                 town = $4, 
                 zip_code = $5, 
                 telephone = $6, 
                 price_range = $7, 
                 opening_hours = $8, 
                 enable_ai_copy = $9, 
                 ai_style = $10,
                 ai_keywords = $11,
                 primary_color = $12,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $13`,
            [
                pageContent,
                escapedBusinessName,
                escapedService,
                escapedTown,
                zipCode,
                telephone || null,
                priceRange || null,
                openingHours || null,
                enableAICopy || false,
                aiStyle || null,
                aiKeywords || null,
                primaryColorValue,
                pageId
            ]
        );

        const pageData = {
            pageId,
            businessName: escapedBusinessName,
            service: escapedService,
            town: escapedTown,
            zipCode,
            telephone: telephone || null,
            priceRange: priceRange || null,
            openingHours: openingHours || null,
            enableAICopy: enableAICopy || false,
            aiStyle: aiStyle || null,
            aiKeywords: aiKeywords || null,
            primaryColor: primaryColorValue,
            updatedAt: new Date().toISOString()
        };

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
