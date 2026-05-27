import { kv } from '@vercel/kv';
import slugify from 'slugify';
import fs from 'fs';
import path from 'path';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async (req, res, currentKvClient) => {
    const currentKv = currentKvClient || kv;
    const { slug } = req.query;

    try {
        if (!slug || slug.length !== 2) {
            return res.status(404).send('Not Found');
        }

        const [clientId, fileName] = slug;
        const [serviceSlug, townSlug] = fileName.replace('.html', '').split('-in-');

        // Fetch client and their parent agency from PostgreSQL
        const clientResult = await query('SELECT id, name, email, agency_id FROM users WHERE id = $1', [clientId]);
        if (clientResult.rows.length === 0) {
            return res.status(404).send('Not Found');
        }

        const client = clientResult.rows[0];
        let logoUrl = null;
        let primaryColorValue = '#007bff';
        let agencyName = '';

        if (client.agency_id) {
            const agencyResult = await query('SELECT name, logo_url, primary_color FROM users WHERE id = $1', [client.agency_id]);
            if (agencyResult.rows.length > 0) {
                const agency = agencyResult.rows[0];
                logoUrl = agency.logo_url || null;
                primaryColorValue = agency.primary_color || '#007bff';
                agencyName = agency.name || '';
            }
        }

        const pageIds = await currentKv.smembers(`user:${clientId}:pages`);
        if (!pageIds || pageIds.length === 0) {
            await logError(new Error(`Page IDs not found for client: ${clientId}`), 'Slug Handler - Page IDs Not Found', 'slug_error.log');
            return res.status(404).send('Not Found');
        }

        let pageIdToFind = null;
        for (const pageId of pageIds) {
            const page = await currentKv.hgetall(pageId);
            if (page && slugify(page.service, { lower: true, strict: true }) === serviceSlug && slugify(page.town, { lower: true, strict: true }) === townSlug) {
                pageIdToFind = pageId;
                break;
            }
        }

        if (!pageIdToFind) {
            await logError(new Error(`Page not found for client: ${clientId}, file: ${fileName}`), 'Slug Handler - Specific Page Not Found', 'slug_error.log');
            return res.status(404).send('Not Found');
        }

        const page = await currentKv.hgetall(pageIdToFind);

        if (!page) {
            await logError(new Error(`Page data not found for pageId: ${pageIdToFind}`), 'Slug Handler - Page Data Not Found', 'slug_error.log');
            return res.status(404).send('Not Found');
        }

        let template;
        try {
            template = fs.readFileSync(path.join(process.cwd(), 'page-template.html'), 'utf8');
        } catch (error) {
            console.error('Error reading page template:', error);
            await logError(error, 'Slug Handler - Template Read Error', 'slug_error.log');
            return res.status(500).json({ message: 'Error loading page template.' });
        }

        const resolvedServiceSlug = slugify(page.service, { lower: true, strict: true });
        const resolvedTownSlug = slugify(page.town, { lower: true, strict: true });

        // Generate fallback descriptions & schema (consistent with generate-seo-pages.js)
        const metaDescription = `Get expert ${page.service} in ${page.town} from ${page.businessName}. We provide top-quality ${page.service} with reliable service. Contact us today for a free quote!`;
        const ogDescription = metaDescription;
        const twitterDescription = metaDescription;

        const localBusinessSchema = `
<script type="application/ld+json">
{
  "@context": "http://schema.org",
  "@type": "LocalBusiness",
  "name": "${page.businessName}",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "${page.town}"
  },
  "url": "https://www.localseogen.com/${resolvedServiceSlug}-in-${resolvedTownSlug}.html",
  "description": "Expert ${page.service} services in ${page.town} by ${page.businessName}.",
  "image": "${logoUrl || 'https://www.localseogen.com/images/logo.svg'}"
}
</script>
        `.trim();

        const agencyLogoHtml = logoUrl ? `<img src="${logoUrl}" alt="${agencyName} Logo" style="max-height: 50px;">` : page.businessName;
        const aiContentValue = '<p>Contact us today for a free estimate!</p>';

        let pageContent = template
            .replace(/{{businessName}}/g, page.businessName)
            .replace(/{{service}}/g, page.service)
            .replace(/{{town}}/g, page.town)
            .replace(/{{metaDescription}}/g, metaDescription)
            .replace(/{{ogDescription}}/g, ogDescription)
            .replace(/{{twitterDescription}}/g, twitterDescription)
            .replace(/{{primaryColor}}/g, primaryColorValue)
            .replace(/{{agencyLogo}}/g, agencyLogoHtml)
            .replace(/{{ai_content}}/g, aiContentValue)
            .replace(/{{service_slug}}/g, resolvedServiceSlug)
            .replace(/{{town_slug}}/g, resolvedTownSlug)
            .replace(/{{localBusinessSchema}}/g, localBusinessSchema)
            .replace(/{{pageId}}/g, pageIdToFind);

        res.setHeader('Content-Type', 'text/html');
        res.send(pageContent);
    } catch (error) {
        await logError(error, 'Slug Handler - General Error', 'slug_error.log');
        return res.status(500).json({ message: 'Internal server error.' });
    }
};