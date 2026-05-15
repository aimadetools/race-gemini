const fs = require('fs').promises;
const path = require('path');
const slugify = require('slugify');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { parse } = require('cookie'); // Import parse from cookie
const jwt = require('jsonwebtoken'); // Import jwt
const { query } = require('../db/index.js'); // Import PostgreSQL query utility
const { logError } = require('../../lib/logger'); // Import centralized logger
const { parseOpeningHours } = require('../../lib/time-helpers'); // Import parseOpeningHours

// Define the path to the page template
const templatePath = path.join(process.cwd(), 'page-template.html');
const outputDir = path.join(process.cwd(), 'generated-seo-pages');

let geminiApiKey = process.env.GEMINI_API_KEY;
let genAI;
let geminiModel;

if (geminiApiKey) {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
} else {
    console.warn('GEMINI_API_KEY is not set. AI copy generation will be skipped.');
}

// Helper function to generate LocalBusiness schema
function generateLocalBusinessSchema(businessName, service, town, telephone, priceRange, openingHours) {
    const schema = {
        "@context": "http://schema.org",
        "@type": "LocalBusiness",
        "name": businessName,
        "address": {
            "@type": "PostalAddress",
            "addressLocality": town,
            // You might want to add more specific address details here if available
        },
        "hasMap": `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName + ' ' + town)}`,
        "url": `https://www.localleads.pro/${slugify(service, { lower: true, strict: true })}-in-${slugify(town, { lower: true, strict: true })}.html`,
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
        "image": "https://www.localleads.pro/images/logo.svg", // Placeholder: use actual business logo
        "areaServed": {
            "@type": "State", // Could be more specific like City, if needed
            "name": town
        }
    };
    return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
}

// Helper function to parse opening hours string (e.g., "Mo-Fr 09:00-17:00; Sa 10:00-14:00")
function parseOpeningHours(openingHoursString) {

    const defaultOpens = "09:00";
    const defaultCloses = "17:00";
    const schemaDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const dayMap = {
        "mo": "Monday", "mon": "Monday",
        "tu": "Tuesday", "tue": "Tuesday",
        "we": "Wednesday", "wed": "Wednesday",
        "th": "Thursday", "thu": "Thursday",
        "fr": "Friday", "fri": "Friday",
        "sa": "Saturday", "sat": "Saturday",
        "su": "Sunday", "sun": "Sunday"
    };

    const openingHoursSpecifications = [];
    const specs = (openingHoursString || '').split(';').map(s => s.trim()).filter(s => s);

    // If no specs are found, directly use the fallback
    if (specs.length === 0) {
        openingHoursSpecifications.push({
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": schemaDays.map(day => `http://schema.org/${day}`),
            "opens": defaultOpens,
            "closes": defaultCloses
        });
        return openingHoursSpecifications;
    }


    for (const spec of specs) {
        let days = [];
        let opens = defaultOpens;
        let closes = defaultCloses; // Typo here - should be closes
        let dayPart = spec;

        const timeRegex = /(\d{1,2}(:\d{2})?\s*(AM|PM)?)\s*-\s*(\d{1,2}(:\d{2})?\s*(AM|PM)?)/i;
        const timeMatch = spec.match(timeRegex);

        if (timeMatch) {
            opens = convertTo24Hour(timeMatch[1]);
            closes = convertTo24Hour(timeMatch[4]);
            dayPart = spec.substring(0, spec.indexOf(timeMatch[0])).trim();
        }

        // Parse days from dayPart (either full spec or narrowed)
        const rangeMatch = dayPart.match(/([a-z]{2,3})\s*-\s*([a-z]{2,3})/i);
        if (rangeMatch) {
            const startDay = dayMap[rangeMatch[1].toLowerCase()];
            const endDay = dayMap[rangeMatch[2].toLowerCase()];
            if (startDay && endDay) {
                const startIndex = schemaDays.indexOf(startDay);
                const endIndex = schemaDays.indexOf(endDay);
                if (startIndex !== -1 && endIndex !== -1) {
                    if (startIndex <= endIndex) {
                        days = schemaDays.slice(startIndex, endIndex + 1);
                    } else {
                        days = schemaDays.slice(startIndex).concat(schemaDays.slice(0, endIndex + 1));
                    }
                }
            }
        } else {
            const individualDays = dayPart.split(',').map(d => dayMap[d.trim().toLowerCase()]).filter(d => d);
            days = individualDays;
        }

        // If no specific days were found from dayPart, default to all days
        if (days.length === 0) {
            days = schemaDays;
        }
        
        openingHoursSpecifications.push({
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": days.map(day => `http://schema.org/${day}`),
            opens,
            closes
        });
    }

    return openingHoursSpecifications;
}

// Helper function to convert 12-hour time (e.g., "9 AM", "5 PM", "9:30AM") to 24-hour (HH:MM)
function convertTo24Hour(time12h) {
    if (!time12h) return "00:00"; // Default or handle error

    // Remove any spaces around AM/PM and convert to uppercase for consistency
    time12h = time12h.replace(/\s*(am|pm)\s*/i, (match, p1) => p1.toUpperCase()).trim();

    const match = time12h.match(/(\d{1,2})(:(\d{2}))?\s*(AM|PM)?/i);
    if (!match) {
        return "00:00"; // Invalid format, return default
    }

    let [_, hourStr, , minuteStr, ampm] = match;
    let hour = parseInt(hourStr, 10);
    let minute = minuteStr ? parseInt(minuteStr, 10) : 0;

    if (ampm) {
        ampm = ampm.toUpperCase();
        if (ampm === 'PM' && hour < 12) {
            hour += 12;
        } else if (ampm === 'AM' && hour === 12) { // Midnight 12 AM
            hour = 0;
        }
    }

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.authToken; // Changed from 'auth' to 'authToken'
        let userId = null;

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.userId;
            } catch (error) {
                await logError(error, 'Token Verification Failed', 'generate_seo_pages_error.log');
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
            // Fetch user's current credits
            const userCreditsResult = await query('SELECT credits FROM users WHERE id = $1', [userId]);

            if (userCreditsResult.rows.length === 0) {
                await logError(new Error(`User not found for userId: ${userId} during credit check.`), 'Credit Check - User Not Found', 'generate_seo_pages_error.log');
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
                await logError(new Error(`Failed to deduct credits for userId: ${userId}.`), 'Credit Deduction - Failed Update', 'generate_seo_pages_error.log');
                return res.status(500).json({ message: 'Failed to deduct credits. Please try again.' });
            }

            console.log(`User ${userId} deducted ${neededCredits} credits. Remaining credits: ${updateCreditsResult.rows[0].credits}`);


            await fs.mkdir(outputDir, { recursive: true });

            let template;
            try {
                template = await fs.readFile(templatePath, 'utf8');
            } catch (error) {
                console.error('Error reading page template:', error);
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

                    if (enableAICopy && geminiModel) {
                        try {
                            // Generate main AI content
                            const prompt = `Write 2-3 paragraphs of marketing copy in a ${aiStyle || 'professional'} tone for a business called "${businessName}" that provides "${service}" in "${town}". Focus on why a customer should choose them.`;
                            const result = await geminiModel.generateContent(prompt);
                            const response = await result.response;
                            aiContent = response.text();

                            // Generate AI-powered meta description
                            const metaPrompt = `Write a concise and compelling meta description (around 150-160 characters) for a business called "${businessName}" that offers "${service}" in "${town}". Highlight key benefits and encourage clicks.`;
                            const metaResult = await geminiModel.generateContent(metaPrompt);
                            const metaResponse = await metaResult.response;
                            metaDescription = metaResponse.text().trim();
                            // Ensure meta description is within typical limits
                            if (metaDescription.length > 160) {
                                metaDescription = metaDescription.substring(0, 157) + '...';
                            } else if (metaDescription.length < 50) { // Add a fallback if AI generates something too short
                                metaDescription = `Get expert ${service} services in ${town} from ${businessName}. Contact us today for a free quote!`;
                            }

                            // Generate AI-powered Open Graph Description
                            const ogPrompt = `Craft an engaging Open Graph description (up to 200 characters) for a shared link about "${businessName}'s ${service} services in ${town}". Focus on attracting clicks on social media.`;
                            const ogResult = await geminiModel.generateContent(ogPrompt);
                            const ogResponse = await ogResult.response;
                            ogDescription = ogResponse.text().trim();
                            if (ogDescription.length > 200) {
                                ogDescription = ogDescription.substring(0, 197) + '...';
                            }

                            // Generate AI-powered Twitter Description
                            const twitterPrompt = `Write a compelling Twitter card description (up to 200 characters) for a tweet promoting "${businessName}'s ${service} services in ${town}". Encourage retweets and engagement.`;
                            const twitterResult = await geminiModel.generateContent(twitterPrompt);
                            const twitterResponse = await twitterResult.response;
                            twitterDescription = twitterResponse.text().trim();
                            if (twitterDescription.length > 200) {
                                twitterDescription = twitterDescription.substring(0, 197) + '...';
                            }


                        } catch (aiError) {
                            console.error('Error generating AI content or meta descriptions:', aiError);
                            aiContent = '<p>AI copy generation failed. Please try again later or contact support.</p>';
                            metaDescription = `Find the best ${service} services in ${town} with ${businessName}. Quality service guaranteed.`;
                            ogDescription = `Discover ${businessName}'s top-rated ${service} services in ${town}. Click to learn more and get a free quote!`;
                            twitterDescription = `Need ${service} in ${town}? ${businessName} offers reliable service. Get a free quote today! #{{service_slug}} #{{town_slug}}`;
                        }
                    } else if (enableAICopy && !geminiModel) {
                        aiContent = '<p>AI copy is unavailable due to missing API key. Contact support.</p>';
                        metaDescription = `Discover reliable ${service} services in ${town} from ${businessName}. Book your consultation today!`;
                        ogDescription = `Discover ${businessName}'s reliable ${service} services in ${town}. Learn how we can help you today!`;
                        twitterDescription = `Looking for ${service} in ${town}? Check out ${businessName} for quality and trusted service!`;
                    } else {
                        aiContent = '<p>Contact us today for a free estimate!</p>';
                        metaDescription = `Get expert ${service} in ${town} from ${businessName}. We provide top-quality ${service} with reliable service. Contact us today for a free quote!`;
                        ogDescription = `Get expert ${service} in ${town} from ${businessName}. We provide top-quality ${service} with reliable service. Contact us today for a free quote!`;
                        twitterDescription = `Get expert ${service} in ${town} from ${businessName}. We provide top-quality ${service} with reliable service. Contact us today for a free quote!`;
                    }

                    const resolvedPrimaryColor = primaryColor || '#007bff'; // Use provided color or default
                    const localBusinessSchema = generateLocalBusinessSchema(businessName, service, town, telephone, priceRange, openingHours);

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
                        .replace(/{{localBusinessSchema}}/g, localBusinessSchema);
                    
                    // The page-template.html uses {{pageId}} for tracking.
                    // This endpoint is for generating static files, so a unique ID is not
                    // strictly necessary in the file itself, unless for specific analytics
                    // if these files were to be hosted and tracked individually.
                    // For now, replacing it with a placeholder or empty string.
                    pageContent = pageContent.replace(/{{pageId}}/g, `static-seo-page-${serviceSlug}-${townSlug}`);


                    await fs.writeFile(filePath, pageContent, 'utf8');
                    generatedPages.push({ fileName, path: filePath, url: `/generated-seo-pages/${fileName}` });
                }
            }

            res.status(200).json({
                message: 'SEO pages generated successfully!',
                pages: generatedPages,
                outputDirectory: outputDir
            });

        } catch (error) {
            console.error('Error in generate-seo-pages API:', error);
            const logDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logDir)) { // Synchronous check for logs directory before async write
                await fs.mkdir(logDir, { recursive: true });
            }
            const logFilePath = path.join(logDir, 'generate_seo_pages_error.log');
            const timestamp = new Date().toISOString();
            const errorMessage = `[${timestamp}] Error in generate-seo-pages API: ${error.message}
Stack: ${error.stack}

`;
            await fs.appendFile(logFilePath, errorMessage);
            return res.status(500).json({ message: 'Internal server error during page generation.' });
        }

    } else {
        res.status(405).send('Method Not Allowed');
    }
};