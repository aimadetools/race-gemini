const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
    if (req.method === 'POST') {
        const { businessName, services, towns } = req.body;

        if (!businessName || !services || !towns) {
            return res.status(400).send('Missing required fields');
        }

        const servicesArray = services.split(',').map(s => s.trim());
        const townsArray = towns.split(',').map(t => t.trim());

        const templatePath = path.resolve(process.cwd(), 'page-template.html');
        const template = fs.readFileSync(templatePath, 'utf8');

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
                const fileName = `${service.toLowerCase().replace(/ /g, '-')}-in-${town.toLowerCase().replace(/ /g, '-')}.html`;
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
