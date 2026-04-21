const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

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
                // Invalid token, proceed as anonymous
            }
        }


        const servicesArray = services.split(',').map(s => s.trim());
        const townsArray = towns.split(',').map(t => t.trim());

        let template;
        try {
            template = fs.readFileSync(templatePath, 'utf8');
        } catch (error) {
            console.error('Error reading page template:', error);
            return res.status(500).json({ message: 'Error loading page template.' });
        }

        if (userId) {
            try {
                await pool.query(
                    'INSERT INTO generated_pages (user_id, business_name, zip_code) VALUES ($1, $2, $3)',
                    [userId, businessName, zipCode]
                );
            } catch (error) {
                console.error('Error saving generated page to database:', error);
                // Decide if you want to stop the process or just log the error
            }
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
                const serviceSlug = slugify(service, { lower: true, strict: true });
                const townSlug = slugify(town, { lower: true, strict: true });
                const fileName = `${serviceSlug}-in-${townSlug}.html`;
                let pageContent = template.replace(/{{businessName}}/g, businessName);
                pageContent = pageContent.replace(/{{service}}/g, service);
                pageContent = pageContent.replace(/{{town}}/g, town);
                
                archive.append(pageContent, { name: fileName });
            }
        }

        archive.finalize();

    } else {
        res.status(405).send('Method Not Allowed');
    }
};
