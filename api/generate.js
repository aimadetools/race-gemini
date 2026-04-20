const archiver = require('archiver');

module.exports = (req, res) => {
    if (req.method === 'POST') {
        const { businessName, services, towns } = req.body;

        if (!businessName || !services || !towns) {
            return res.status(400).send('Missing required fields');
        }

        const servicesArray = services.split(',').map(s => s.trim());
        const townsArray = towns.split(',').map(t => t.trim());

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
                const pageContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${businessName} - ${service} in ${town}</title>
</head>
<body>
    <h1>${businessName}</h1>
    <h2>${service} in ${town}</h2>
    <p>Looking for the best ${service} in ${town}? Look no further! ${businessName} offers top-notch ${service} services to the residents of ${town}.</p>
</body>
</html>`;
                archive.append(pageContent, { name: fileName });
            }
        }

        archive.finalize();

    } else {
        res.status(405).send('Method Not Allowed');
    }
};
