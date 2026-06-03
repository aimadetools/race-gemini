import fs from 'fs';
import path from 'path';
import slugify from 'slugify';
import { getFallbackMarketingCopy } from '../lib/fallback-copy.js';

const templatePath = path.join(process.cwd(), 'page-template.html');

// Helper to escape HTML to mitigate XSS
const escapeHtml = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, (match) => {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[match];
    });
};

export default async (req, res) => {
    // Only support GET requests for previews so users can open in a new tab easily
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).end('Method Not Allowed');
    }

    const { businessName, service, town, primaryColor } = req.query;

    if (!businessName || !service || !town) {
        return res.status(400).send('<h1>Error: Missing required query parameters: businessName, service, town</h1>');
    }

    const escapedBusinessName = escapeHtml(businessName.trim());
    const escapedService = escapeHtml(service.trim());
    const escapedTown = escapeHtml(town.trim());
    const resolvedColor = escapeHtml(primaryColor ? primaryColor.trim() : '#3b82f6');

    try {
        if (!fs.existsSync(templatePath)) {
            return res.status(500).send('<h1>Error: Page template missing</h1>');
        }

        const template = fs.readFileSync(templatePath, 'utf8');

        const serviceSlug = slugify(escapedService, { lower: true, strict: true });
        const townSlug = slugify(escapedTown, { lower: true, strict: true });

        const aiContent = getFallbackMarketingCopy(escapedBusinessName, escapedService, escapedTown);
        const metaDescription = `Looking for professional ${escapedService} in ${escapedTown}? Contact ${escapedBusinessName} today for reliable and trusted services.`;
        const ogDescription = `Discover ${escapedBusinessName}'s premier ${escapedService} services in ${escapedTown}. Get a free estimate today!`;
        const twitterDescription = `Need ${escapedService} in ${escapedTown}? Choose ${escapedBusinessName} for expert service.`;

        // Simple mock local business schema
        const localBusinessSchema = `<script type="application/ld+json">
{
  "@context": "http://schema.org",
  "@type": "LocalBusiness",
  "name": "${escapedBusinessName}",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "${escapedTown}"
  },
  "url": "https://www.localseogen.com/preview"
}
</script>`;

        let pageContent = template
            .replace(/{{businessName}}/g, escapedBusinessName)
            .replace(/{{service}}/g, escapedService)
            .replace(/{{town}}/g, escapedTown)
            .replace(/{{primaryColor}}/g, resolvedColor)
            .replace(/{{ai_content}}/g, aiContent)
            .replace(/{{metaDescription}}/g, metaDescription)
            .replace(/{{ogDescription}}/g, ogDescription)
            .replace(/{{twitterDescription}}/g, twitterDescription)
            .replace(/{{service_slug}}/g, serviceSlug)
            .replace(/{{town_slug}}/g, townSlug)
            .replace(/{{localBusinessSchema}}/g, localBusinessSchema)
            .replace(/{{pageId}}/g, 'preview-page');

        // Inject the watermark banner right after <body> tag
        const bannerHtml = `
<div style="background: linear-gradient(135deg, #0f172a, #1e293b); color: white; padding: 12px 20px; text-align: center; font-family: 'Inter', sans-serif; position: sticky; top: 0; z-index: 99999; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border-bottom: 2px solid #3b82f6; display: flex; align-items: center; justify-content: center; gap: 15px; flex-wrap: wrap;">
    <span style="font-size: 0.95rem; font-weight: 500; letter-spacing: -0.01em;">✨ <strong>Live Demo:</strong> This is a free preview of your page in <strong>${escapedTown}</strong>.</span>
    <a href="/pricing.html" style="background: #3b82f6; color: white; padding: 6px 16px; border-radius: 6px; font-weight: 700; text-decoration: none; font-size: 0.85rem; transition: background 0.2s; box-shadow: 0 2px 5px rgba(59, 130, 246, 0.4);">Download 50+ Pages Now</a>
</div>
`;
        
        // Find <body> and inject the banner
        pageContent = pageContent.replace(/<body>/i, `<body>${bannerHtml}`);

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(pageContent);

    } catch (error) {
        console.error('Error generating preview:', error);
        res.status(500).send(`<h1>Error generating preview page</h1><pre>${escapeHtml(error.message)}</pre>`);
    }
};
