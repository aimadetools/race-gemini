import { promises as fs } from 'fs';
import path from 'path';
import slugify from 'slugify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError, logInfo } from '../lib/logger.js';
import { updateStaticSitemapAndPing } from '../lib/indexing.js';
import { parseOpeningHours } from '../lib/time-helpers.js';
import { getFallbackMarketingCopy } from '../lib/fallback-copy.js';
import { getSchemaType } from '../lib/schema.js';

// Define the path to the page template
const templatePath = path.join(process.cwd(), 'page-template.html');
const outputDir = path.join(process.cwd(), 'generated-seo-pages');

function getGeminiModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-pro' });
}

async function generateAIContent(prompt, defaultValue) {
    const geminiModel = getGeminiModel();
    if (!geminiModel) {
        await logError(new Error('GEMINI_API_KEY is not set.'), 'AI Content Generation Skipped');
        return defaultValue;
    }
    try {
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (aiError) {
        await logError(aiError, `Error generating AI content for prompt: "${prompt.substring(0, 50)}..."`);
        return defaultValue;
    }
}

// Helper function to generate LocalBusiness schema
function generateLocalBusinessSchema(businessName, service, town, telephone, priceRange, openingHours) {
    const schema = {
        "@context": "http://schema.org",
        "@type": getSchemaType(service),
        "name": businessName,
        "address": {
            "@type": "PostalAddress",
            "addressLocality": town,
            // You might want to add more specific address details here if available
        },
        "hasMap": `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName + ' ' + town)}`,
        "url": `https://www.localseogen.com/${slugify(service, { lower: true, strict: true })}-in-${slugify(town, { lower: true, strict: true })}.html`,
        "telephone": telephone || "", // Use provided telephone or default to empty string
        "priceRange": priceRange || "", // Use provided priceRange or default to empty string
        "openingHoursSpecification": openingHours ? parseOpeningHours(openingHours) : [ // Use provided openingHours if available, otherwise default
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
        "servesCuisine": service, // Using service as servesCuisine for now, can be more specific
        "description": `Expert ${service} services in ${town} by ${businessName}.`,
        "image": "https://www.localseogen.com/images/logo.svg", // Placeholder: use actual business logo
        "areaServed": {
            "@type": "State", // Could be more specific like City, if needed
            "name": town
        }
    };
    return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
}



export default async (req, res) => {
    if (req.method === 'POST') {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.authToken; // Changed from 'auth' to 'authToken'
        let userId = null;

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.userId;
            } catch (error) {
                await logError(error, 'Token Verification Failed');
                return res.status(401).json({ message: 'Invalid or expired token.' });
            }
        }

        if (!userId) {
            return res.status(401).json({ message: 'Authentication required to generate pages.' });
        }

        const { businessName, services, towns, enableAICopy = false, aiStyle, primaryColor, telephone, priceRange, openingHours } = req.body;

        if (!businessName || !services || !towns) {
            return res.status(400).json({ message: 'Missing required fields: businessName, services, and towns.' });
        }

        const servicesArray = Array.isArray(services) ? services : services.split(',').map(s => s.trim());
        const townsArray = Array.isArray(towns) ? towns : towns.split(',').map(t => t.trim());

        if (servicesArray.length === 0 || townsArray.length === 0) {
            return res.status(400).json({ message: 'Services and towns cannot be empty.' });
        }

        const neededCredits = servicesArray.length * townsArray.length;

        try {
            const geminiModel = getGeminiModel();
            // Fetch user's current credits
            const userCreditsResult = await query('SELECT credits FROM users WHERE id = $1', [userId]);

            if (userCreditsResult.rows.length === 0) {
                await logError(new Error(`User not found for userId: ${userId} during credit check.`), 'Credit Check - User Not Found');
                return res.status(404).json({ message: 'User not found.' });
            }

            const currentCredits = userCreditsResult.rows[0].credits;

            if (currentCredits < neededCredits) {
                return res.status(403).json({ message: `Insufficient credits. You need ${neededCredits} credits but have ${currentCredits}. Please purchase more.` });
            }

            // Deduct credits before generating pages
            const updateCreditsResult = await query(
                'UPDATE users SET credits = credits - $1 WHERE id = $2 RETURNING credits',
                [neededCredits, userId]
            );

            if (updateCreditsResult.rows.length === 0) {
                await logError(new Error(`Failed to deduct credits for userId: ${userId}.`), 'Credit Deduction - Failed Update');
                return res.status(500).json({ message: 'Failed to deduct credits. Please try again.' });
            }

            await logInfo(`User ${userId} deducted ${neededCredits} credits. Remaining credits: ${updateCreditsResult.rows[0].credits}`, 'Credit Deduction');


            await fs.mkdir(outputDir, { recursive: true });

            let template;
            try {
                template = await fs.readFile(templatePath, 'utf8');
            } catch (error) {
                await logError(error, 'Error reading page template.');
                return res.status(500).json({ message: 'Error loading page template.' });

            }

            const generatedPages = [];

            for (const town of townsArray) {
                for (const service of servicesArray) {
                    const serviceSlug = slugify(service, { lower: true, strict: true });
                    const townSlug = slugify(town, { lower: true, strict: true });
                    const businessSlug = slugify(businessName, { lower: true, strict: true });
                    const fileName = `${serviceSlug}-in-${townSlug}-${businessSlug}.html`;
                    const filePath = path.join(outputDir, fileName);


                    let aiContent = '';
                    let metaDescription = '';
                    let ogDescription = '';
                    let twitterDescription = '';

                    if (enableAICopy && geminiModel) {
                        try {
                            // Generate main AI content
                            const prompt = `Write 2-3 paragraphs of marketing copy in a ${aiStyle || 'professional'} tone for a business called "${businessName}" that provides "${service}" in "${town}". Focus on why a customer should choose them.`;
                            aiContent = await generateAIContent(prompt, '<p>AI copy generation failed. Please try again later or contact support.</p>');

                            // Generate AI-powered meta description
                            const metaPrompt = `Write a concise and compelling meta description (around 150-160 characters) for a business called "${businessName}" that offers "${service}" in "${town}". Highlight key benefits and encourage clicks.`;
                            metaDescription = await generateAIContent(metaPrompt, `Find the best ${service} services in ${town} with ${businessName}. Quality service guaranteed.`);
                            // Ensure meta description is within typical limits
                            if (metaDescription.length > 160) {
                                metaDescription = metaDescription.substring(0, 157) + '...';
                            } else if (metaDescription.length < 50) { // Add a fallback if AI generates something too short
                                metaDescription = `Get expert ${service} services in ${town} from ${businessName}. Contact us today for a free quote!`;
                            }

                            // Generate AI-powered Open Graph Description
                            const ogPrompt = `Craft an engaging Open Graph description (up to 200 characters) for a shared link about "${businessName}'s ${service} services in ${town}". Focus on attracting clicks on social media.`;
                            ogDescription = await generateAIContent(ogPrompt, `Discover ${businessName}'s top-rated ${service} services in ${town}. Click to learn more and get a free quote!`);
                            if (ogDescription.length > 200) {
                                ogDescription = ogDescription.substring(0, 197) + '...';
                            }

                            // Generate AI-powered Twitter Description
                            const twitterPrompt = `Write a compelling Twitter card description (up to 200 characters) for a tweet promoting "${businessName}'s ${service} services in ${town}". Encourage retweets and engagement.`;
                            twitterDescription = await generateAIContent(twitterPrompt, `Need ${service} in ${town}? ${businessName} offers reliable service. Get a free quote today! #{{service_slug}} #{{town_slug}}`);
                            if (twitterDescription.length > 200) {
                                twitterDescription = twitterDescription.substring(0, 197) + '...';
                            }
                        } catch (aiContentError) {
                            await logError(aiContentError, `Error generating AI content for ${service} in ${town}.`);
                            aiContent = getFallbackMarketingCopy(businessName, service, town);
                            metaDescription = `Find the best ${service} services in ${town} with ${businessName}. Quality service guaranteed.`;
                            ogDescription = `Discover ${businessName}'s top-rated ${service} services in ${town}. Click to learn more and get a free quote!`;
                            twitterDescription = `Need ${service} in ${town}? ${businessName} offers reliable service. Get a free quote today! #{{service_slug}} #{{town_slug}}`;
                        }
                    } else {
                        aiContent = getFallbackMarketingCopy(businessName, service, town);
                        metaDescription = `Get expert ${service} in ${town} from ${businessName}. We provide top-quality ${service} with reliable service. Contact us today for a free quote!`;
                        ogDescription = `Get expert ${service} in ${town} from ${businessName}. We provide top-quality ${service} with reliable service. Contact us today for a free quote!`;
                        twitterDescription = `Get expert ${service} in ${town} from ${businessName}. We provide top-quality ${service} with reliable service. Contact us today for a free quote!`;
                    }

                    const resolvedPrimaryColor = primaryColor || '#007bff'; // Use provided color or default
                    const localBusinessSchema = generateLocalBusinessSchema(businessName, service, town, telephone, priceRange, openingHours);

                    const resolvedPhone = telephone || '';
                    const resolvedPriceRange = priceRange || 'Standard';
                    const resolvedOpeningHours = openingHours || 'Mo-Fr 09:00-17:00';
                    const phoneCtaDisplay = telephone ? 'inline-block' : 'none';

                    let pageContent = template
                        .replace(/{{businessName}}/g, businessName)
                        .replace(/{{service}}/g, service)
                        .replace(/{{town}}/g, town)
                        .replace(/{{primaryColor}}/g, resolvedPrimaryColor)
                        .replace(/{{ai_content}}/g, aiContent)
                        .replace(/{{metaDescription}}/g, metaDescription) // New replacement
                        .replace(/{{ogDescription}}/g, ogDescription) // New replacement for OG
                        .replace(/{{twitterDescription}}/g, twitterDescription) // New replacement for Twitter
                        .replace(/{{service_slug}}/g, serviceSlug)
                        .replace(/{{town_slug}}/g, townSlug)
                        .replace(/{{localBusinessSchema}}/g, localBusinessSchema)
                        .replace(/{{telephone}}/g, resolvedPhone)
                        .replace(/{{priceRange}}/g, resolvedPriceRange)
                        .replace(/{{openingHours}}/g, resolvedOpeningHours)
                        .replace(/{{phoneCtaDisplay}}/g, phoneCtaDisplay)
                        .replace(/{{agencyLogo}}/g, businessName);
                    
                    pageContent = pageContent.replace(/{{pageId}}/g, `static-seo-page-${serviceSlug}-${townSlug}`);


                    await fs.writeFile(filePath, pageContent, 'utf8');

                    // Save to database as well so it can be served dynamically in production Vercel
                    const pageSlug = `${serviceSlug}-in-${townSlug}-${businessSlug}`;
                    await query(
                        `INSERT INTO seo_pages (file_name, slug, content, user_id)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (slug) DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP`,
                        [fileName, pageSlug, pageContent, userId]
                    );

                    generatedPages.push({ fileName, path: filePath, url: `/generated-seo-pages/${fileName}` });
                }
            }

            // Construct absolute URLs for sitemap update
            const domain = process.env.DOMAIN_URL || 'https://www.localseogen.com';
            const absoluteUrls = generatedPages.map(p => `${domain}${p.url}`);

            // Trigger automated search engine sitemap registration and indexing pings
            await updateStaticSitemapAndPing(absoluteUrls, req, userId);

            res.status(200).json({
                message: 'SEO pages generated successfully!',
                pages: generatedPages,
                outputDirectory: outputDir
            });

        } catch (error) {
            await logError(error, 'Internal server error during page generation.');
            return res.status(500).json({ message: 'Internal server error during page generation.' });
        }

    } else {
        res.status(405).send('Method Not Allowed');
    }
};