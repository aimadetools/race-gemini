const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const { kv } = require('@vercel/kv');
const jwt = require('jsonwebtoken');

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Define the path to the page template
const templatePath = path.join(process.cwd(), 'page-template.html');

let geminiApiKey;
try {
    geminiApiKey = fs.readFileSync('gemini_api_key.txt', 'utf8').trim();
} catch (err) {
    console.error('Could not read gemini_api_key.txt', err);
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
                agency = await kv.get(`agency:${user.agencyId}`);
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
                    const pageId = `page:${Date.now()}${Math.random()}`;
                    const serviceSlug = slugify(service, { lower: true, strict: true });
                    const townSlug = slugify(town, { lower: true, strict: true });
                    const fileName = `${serviceSlug}-in-${townSlug}.html`;
                    let pageContent = template.replace(/{{businessName}}/g, businessName);
                    pageContent = pageContent.replace(/{{service}}/g, service);
                    pageContent = pageContent.replace(/{{town}}/g, town);

                    if (agency && agency.logoUrl) {
                        pageContent = pageContent.replace(/{{agencyLogo}}/g, `<img src="${agency.logoUrl}" alt="${agency.agencyName} Logo" style="max-height: 50px;">`);
                    } else {
                        pageContent = pageContent.replace(/{{agencyLogo}}/g, businessName);
                    }

                    if (agency && agency.primaryColor) {
                        pageContent = pageContent.replace(/{{primaryColor}}/g, agency.primaryColor);
                    } else {
                        pageContent = pageContent.replace(/{{primaryColor}}/g, '#007bff');
                    }
                    
                    let aiContent = '';
                    if (enableAICopy) {
                        if (!geminiApiKey) {
                            console.error('Gemini API Key is missing. AI copy generation skipped.');
                            // Fallback or specific error for client
                            aiContent = '<p>AI copy is unavailable due to missing API key. Contact support.</p>';
                        } else {
                            const genAI = new GoogleGenerativeAI(geminiApiKey);
                            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
                            const prompt = `Write 2-3 paragraphs of marketing copy in a ${aiStyle || 'professional'} tone for a business called "${businessName}" that provides "${service}" in "${town}". Focus on why a customer should choose them.`;
                            const result = await model.generateContent(prompt);
                            const response = await result.response;
                            aiContent = response.text();
                        }
                    } else {
                        aiContent = '<p>Contact us today for a free estimate!</p>';
                    }
                    pageContent = pageContent.replace(/{{ai_content}}/g, aiContent);
                    pageContent = pageContent.replace(/{{pageId}}/g, pageId);


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
