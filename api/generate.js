const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const { kv } = require('@vercel/kv');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const { businessName, services, towns, zipCode, enableAICopy, 'ai-style': aiStyle } = req.body;

        if (!businessName || !services || !towns || !zipCode) {
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
                    return res.status(401).json({ message: 'Authorization failed: Token expired.' });
                } else if (error.name === 'JsonWebTokenError') {
                    return res.status(401).json({ message: 'Authorization failed: Invalid token.' });
                }
                return res.status(401).json({ message: 'Authorization failed: Please log in again.' });
            }
        } else {
            return res.status(401).json({ message: 'Authorization required: No token provided.' });
        }

        const servicesArray = services.split(',').map(s => s.trim());
        const townsArray = towns.split(',').map(t => t.trim());
        const pagesToGenerate = servicesArray.length * townsArray.length;

        try {
            // Retrieve user email from userId
            const userEmail = await kv.get(`userId:${userId}`);
            if (!userEmail) {
                return res.status(404).json({ message: 'User not found. Please log in again.' });
            }

            // Retrieve full user object
            const userString = await kv.get(`user:${userEmail}`);
            if (!userString) {
                return res.status(404).json({ message: 'User profile not found. Please log in again.' });
            }
            let user = JSON.parse(userString);

            if (user.credits < pagesToGenerate) {
                return res.status(402).json({ message: `Insufficient credits. You need ${pagesToGenerate} credits but only have ${user.credits}. Please buy more credits.` });
            }

            let agency = null;
            if (user.agencyId) {
                const agencyData = await kv.get(`agency:${user.agencyId}`);
                if (agencyData) {
                    agency = JSON.parse(agencyData);
                }
            }

            let template;
            try {
                template = fs.readFileSync(templatePath, 'utf8');
            } catch (error) {
                console.error('Error reading page template:', error);
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

            for (const town of townsArray) {
                for (const service of servicesArray) {
                    const pageId = `page:${Date.now()}${Math.random()}`; // Unique ID for each page
                    const serviceSlug = slugify(service, { lower: true, strict: true });
                    const townSlug = slugify(town, { lower: true, strict: true });
                    const fileName = `${serviceSlug}-in-${townSlug}.html`;

                    let aiContent = '';
                    if (enableAICopy && geminiModel) {
                        try {
                            const prompt = `Write 2-3 paragraphs of marketing copy in a ${aiStyle || 'professional'} tone for a business called "${businessName}" that provides "${service}" in "${town}". Focus on why a customer should choose them.`;
                            const result = await geminiModel.generateContent(prompt);
                            const response = await result.response;
                            aiContent = response.text();
                        } catch (aiError) {
                            console.error('Error generating AI content:', aiError);
                            aiContent = '<p>AI copy generation failed. Please try again later or contact support.</p>';
                        }
                    } else if (enableAICopy && !geminiModel) {
                        aiContent = '<p>AI copy is unavailable due to missing API key. Contact support.</p>';
                    } else {
                        aiContent = '<p>Contact us today for a free estimate!</p>';
                    }

                    const agencyLogoHtml = (agency && agency.logoUrl) ? `<img src="${agency.logoUrl}" alt="${agency.agencyName} Logo" style="max-height: 50px;">` : businessName;
                    const primaryColorValue = (agency && agency.primaryColor) ? agency.primaryColor : '#007bff';

                    let pageContent = template
                        .replace(/{{businessName}}/g, businessName)
                        .replace(/{{service}}/g, service)
                        .replace(/{{town}}/g, town)
                        .replace(/{{agencyLogo}}/g, agencyLogoHtml)
                        .replace(/{{primaryColor}}/g, primaryColorValue)
                        .replace(/{{ai_content}}/g, aiContent);
                    // pageId is used for tracking and should not be injected directly into the HTML
                    // If it needs to be in the HTML, add a specific placeholder for it in the template
                    // For now, removing direct replacement here to avoid unintended exposure.


                    archive.append(pageContent, { name: fileName });

                    // Store page metadata
                    await kv.set(pageId, JSON.stringify({
                        businessName,
                        service,
                        town,
                        zipCode,
                        createdAt: new Date().toISOString(),
                        enableAICopy: enableAICopy || false,
                        aiStyle: aiStyle || null,
                        userId: user.id // Link page to user
                    }));
                    await kv.sadd(`user:${userId}:pages`, pageId);
                }
            }

            // Decrement user credits and save updated user object
            user.credits -= pagesToGenerate;
            await kv.set(`user:${userEmail}`, JSON.stringify(user));

            archive.finalize();

        } catch (error) {
            console.error('Error generating pages:', error);
            // Log error to file for better debugging
            const logDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            const logFilePath = path.join(logDir, 'generate_error.log');
            const timestamp = new Date().toISOString();
            const errorMessage = `[${timestamp}] Error generating pages: ${error.message}\nStack: ${error.stack}\n\n`;
            fs.appendFileSync(logFilePath, errorMessage);

            return res.status(500).json({ message: 'Error generating pages' });
        }

    } else {
        res.status(405).send('Method Not Allowed');
    }
};
