const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const { kv } = require('@vercel/kv');
const jwt = require('jsonwebtoken');

// Define the path to the page template
const templatePath = path.join(process.cwd(), 'page-template.html');

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const { businessName, services, towns, zipCode } = req.body;

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
                return res.status(401).json({ message: 'Invalid or expired token' });
            }
        } else {
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        const servicesArray = services.split(',').map(s => s.trim());
        const townsArray = towns.split(',').map(t => t.trim());
        const pagesToGenerate = servicesArray.length * townsArray.length;

        try {
            const user = await kv.hgetall(userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (user.credits < pagesToGenerate) {
                return res.status(402).json({ message: 'Insufficient credits' });
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
                    
                    archive.append(pageContent, { name: fileName });

                    await kv.hset(pageId, {
                        businessName,
                        service,
                        town,
                        zipCode,
                        createdAt: new Date().toISOString()
                    });
                    await kv.lpush(`user:${userId}:pages`, pageId);
                }
            }

            await kv.hincrby(userId, 'credits', -pagesToGenerate);

            archive.finalize();

        } catch (error) {
            console.error('Error generating pages:', error);
            return res.status(500).json({ message: 'Error generating pages' });
        }

    } else {
        res.status(405).send('Method Not Allowed');
    }
};
