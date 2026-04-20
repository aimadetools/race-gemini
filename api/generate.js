const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

// Define the path to the page template
const templatePath = path.join(process.cwd(), 'page-template.html');

module.exports = (req, res) => {
    if (req.method === 'POST') {
        const { businessName, services, towns } = req.body;

        if (!businessName || !services || !towns) {
            return res.status(400).json({ message: 'Missing required fields' });
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
