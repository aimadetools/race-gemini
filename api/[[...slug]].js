import { kv } from '@vercel/kv';
import slugify from 'slugify';
import fs from 'fs';
import path from 'path';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';
import { getSchemaType } from '../lib/schema.js';
import * as cheerio from 'cheerio';
import { renderTestimonialsSection, generateSchemaReviews } from '../lib/testimonials-helper.js';
import { renderMapSection } from '../lib/map-helper.js';
import { generateFaqs } from '../lib/faq-helper.js';

export default async (req, res, currentKvClient) => {
    const currentKv = currentKvClient || kv;
    const { slug } = req.query;

    try {
        if (!slug || slug.length !== 2) {
            return res.status(404).send('Not Found');
        }

        const [clientId, fileName] = slug;
        let resolvedClientId = clientId;
        let isCustomDomain = false;

        const host = req.headers.host || '';
        const cleanHost = host.split(':')[0].toLowerCase(); // strip port if any

        const primaryDomains = ['localseogen.com', 'www.localseogen.com', 'localhost', '127.0.0.1'];
        const isPrimaryDomain = primaryDomains.some(d => cleanHost === d || cleanHost.includes(d));

        let domainResult;
        if (clientId === 'custom') {
            if (isPrimaryDomain && !cleanHost.includes('localhost') && !cleanHost.includes('127.0.0.1')) {
                return res.status(404).send('Not Found');
            }
            isCustomDomain = true;
            // Lookup user by cleanHost
            domainResult = await query(
                'SELECT id, name, email, is_agency, logo_url, primary_color, custom_domain_redirect, google_verification_code FROM users WHERE LOWER(custom_domain) = $1',
                [cleanHost]
            );
            if (domainResult.rows.length === 0) {
                return res.status(404).send('Not Found: Custom domain not configured');
            }
            resolvedClientId = domainResult.rows[0].id.toString();
        }

        if (fileName && fileName.toLowerCase().startsWith('google') && fileName.toLowerCase().endsWith('.html')) {
            let userVerificationCode = null;
            if (isCustomDomain && domainResult) {
                userVerificationCode = domainResult.rows[0].google_verification_code;
            } else {
                const clientResult = await query('SELECT google_verification_code FROM users WHERE id = $1', [resolvedClientId]);
                if (clientResult.rows.length > 0) {
                    userVerificationCode = clientResult.rows[0].google_verification_code;
                }
            }

            if (userVerificationCode && userVerificationCode.toLowerCase() === fileName.toLowerCase()) {
                res.setHeader('Content-Type', 'text/html');
                return res.status(200).send(`google-site-verification: ${fileName}`);
            }
            return res.status(404).send('Not Found');
        }

        if (fileName === 'sitemap.xml') {
            const clientResult = await query('SELECT id, name, email FROM users WHERE id = $1', [resolvedClientId]);
            if (clientResult.rows.length === 0) {
                return res.status(404).send('Not Found');
            }

            const pagesResult = await query(
                'SELECT service, town, created_at FROM seo_pages WHERE user_id = $1',
                [resolvedClientId]
            );
            let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

            const hostHeader = req.headers.host || 'localseogen.com';
            const protocol = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1') ? 'http' : 'https';
            const baseUrl = `${protocol}://${hostHeader}`;

            for (const row of pagesResult.rows) {
                if (row.service && row.town) {
                    const resolvedServiceSlug = slugify(row.service, { lower: true, strict: true });
                    const resolvedTownSlug = slugify(row.town, { lower: true, strict: true });
                    const locUrl = isCustomDomain 
                        ? `${baseUrl}/${resolvedServiceSlug}-in-${resolvedTownSlug}.html`
                        : `${baseUrl}/${resolvedClientId}/${resolvedServiceSlug}-in-${resolvedTownSlug}.html`;
                    const lastmod = row.created_at ? row.created_at.toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10);
                    xml += `  <url>\n    <loc>${locUrl}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
                }
            }

            xml += '</urlset>';
            res.setHeader('Content-Type', 'application/xml');
            return res.status(200).send(xml);
        }

        const [serviceSlug, townSlug] = fileName.replace('.html', '').split('-in-');

        // Fetch client and their parent agency from PostgreSQL
        const clientResult = await query('SELECT id, name, email, agency_id, ga_tracking_id, fb_pixel_id, announcement_text, announcement_type, announcement_coupon_code, announcement_expires_at, announcement_updated_at FROM users WHERE id = $1', [resolvedClientId]);
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

        // Fetch the page from PostgreSQL where user_id = resolvedClientId and file_name = fileName
        const pageResult = await query(
            `SELECT id, business_name, service, town, telephone, price_range, opening_hours, content, primary_color, service_radius, latitude, longitude, faqs 
             FROM seo_pages WHERE user_id = $1 AND file_name = $2`,
            [resolvedClientId, fileName]
        );

        if (pageResult.rows.length === 0) {
            await logError(new Error(`Page not found for client: ${resolvedClientId}, file: ${fileName}`), 'Slug Handler - Specific Page Not Found', 'slug_error.log');
            return res.status(404).send('Not Found');
        }

        // Fetch testimonials for the user
        const testimonialsResult = await query(
            'SELECT author_name, author_avatar, rating, review_text, review_date FROM testimonials WHERE user_id = $1 ORDER BY created_at DESC',
            [resolvedClientId]
        );
        const testimonials = testimonialsResult.rows || [];

        const pageRow = pageResult.rows[0];
        const pageIdToFind = pageRow.id;

        if (pageRow.primary_color) {
            primaryColorValue = pageRow.primary_color;
        }

        const page = {
            businessName: pageRow.business_name,
            service: pageRow.service,
            town: pageRow.town,
            telephone: pageRow.telephone,
            priceRange: pageRow.price_range,
            openingHours: pageRow.opening_hours,
            serviceRadius: pageRow.service_radius,
            latitude: pageRow.latitude,
            longitude: pageRow.longitude
        };

        // Query up to 12 other pages for this user to build Nearby Service Areas link pool
        const otherPagesResult = await query(
            `SELECT service, town FROM seo_pages 
             WHERE user_id = $1 AND id != $2 
             ORDER BY CASE WHEN service = $3 THEN 0 ELSE 1 END, created_at DESC 
             LIMIT 12`,
            [resolvedClientId, pageIdToFind, page.service]
        );

        let nearbyAreasHtml = '';
        if (otherPagesResult && otherPagesResult.rows && otherPagesResult.rows.length > 0) {
            let linksHtml = '';
            for (const row of otherPagesResult.rows) {
                const rowServiceSlug = slugify(row.service, { lower: true, strict: true });
                const rowTownSlug = slugify(row.town, { lower: true, strict: true });
                const linkUrl = isCustomDomain 
                    ? `/${rowServiceSlug}-in-${rowTownSlug}.html`
                    : `/${resolvedClientId}/${rowServiceSlug}-in-${rowTownSlug}.html`;
                
                linksHtml += `
      <a class="nearby-areas-link" href="${linkUrl}">
        <i class="fas fa-map-marker-alt"></i>
        <span>${row.service} in ${row.town}</span>
      </a>`;
            }

            nearbyAreasHtml = `
<!-- Nearby Service Areas Internal Linking Pool -->
<section class="nearby-areas">
  <style>
    .nearby-areas {
      background-color: var(--bg-alt, #f9fafb);
      padding: 3.5rem 0;
      border-top: 1px solid var(--border-color, #e5e7eb);
      border-bottom: 1px solid var(--border-color, #e5e7eb);
    }
    .nearby-areas h3 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 1.5rem;
      color: var(--text-color, #1f2937);
    }
    .nearby-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
    }
    .nearby-areas-link {
      color: var(--primary-color, #007bff);
      text-decoration: none;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: color 0.2s, transform 0.2s;
    }
    .nearby-areas-link:hover {
      color: #2563eb;
      transform: translateX(4px);
    }
    .nearby-areas-link i {
      font-size: 0.875rem;
      opacity: 0.8;
    }
  </style>
  <div class="container">
    <h3>Nearby Service Areas</h3>
    <div class="nearby-grid">
      ${linksHtml.trim()}
    </div>
  </div>
</section>
`;
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
        let metaDescription = `Get expert ${page.service} in ${page.town} from ${page.businessName}. We provide top-quality ${page.service} with reliable service. Contact us today for a free quote!`;
        let ogDescription = metaDescription;
        let twitterDescription = metaDescription;
        let aiContentValue = '<p>Contact us today for a free estimate!</p>';

        if (pageRow.content) {
            try {
                const $ = cheerio.load(pageRow.content);
                
                const desc = $('meta[name="description"]').attr('content');
                if (desc) metaDescription = desc;

                const ogDesc = $('meta[property="og:description"]').attr('content');
                if (ogDesc) ogDescription = ogDesc;

                const twDesc = $('meta[name="twitter:description"]').attr('content');
                if (twDesc) twitterDescription = twDesc;

                const mainContent = $('.main-content').clone();
                if (mainContent.length > 0) {
                    mainContent.find('h2').remove();
                    const extractedAi = mainContent.html()?.trim();
                    if (extractedAi) {
                        aiContentValue = extractedAi;
                    }
                }
            } catch (cheerioError) {
                console.error('Error parsing pageRow.content with cheerio:', cheerioError);
            }
        }

        const hostHeader = req.headers.host || 'localseogen.com';
        const protocol = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1') ? 'http' : 'https';

        const schemaObj = {
          "@context": "http://schema.org",
          "@type": getSchemaType(page.service),
          "name": page.businessName,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": page.town
          },
          "url": `${protocol}://${cleanHost}${isCustomDomain ? '' : '/' + resolvedClientId}/${resolvedServiceSlug}-in-${resolvedTownSlug}.html`,
          "description": `Expert ${page.service} services in ${page.town} by ${page.businessName}.`,
          "image": logoUrl || 'https://www.localseogen.com/images/logo.svg'
        };

        if (testimonials && testimonials.length > 0) {
          const schemaReviews = generateSchemaReviews(testimonials);
          schemaObj.review = schemaReviews.review;
          schemaObj.aggregateRating = schemaReviews.aggregateRating;
        }

        let localBusinessSchema = `
<script type="application/ld+json">
${JSON.stringify(schemaObj, null, 2)}
</script>
        `.trim();

        // Extract and format FAQs
        let faqsList = [];
        if (pageRow.faqs) {
            try {
                faqsList = typeof pageRow.faqs === 'string' ? JSON.parse(pageRow.faqs) : pageRow.faqs;
            } catch (e) {
                console.error('Failed to parse pageRow.faqs:', e);
            }
        }
        
        let faqHtml = '';
        let faqSchemaScript = '';
        
        if (faqsList && faqsList.length >= 3) {
            const accordionItemsHtml = faqsList.map((faq) => `
      <div class="faq-item">
        <div class="faq-question">
          <span>${faq.question}</span>
        </div>
        <div class="faq-answer">
          <p>${faq.answer}</p>
        </div>
      </div>`).join('\n');

            faqHtml = `
<!-- Frequently Asked Questions Accordion Section -->
<section class="faq-section" id="faq-section">
  <style>
    .faq-section {
      padding: 5rem 0;
      background-color: var(--bg-alt, #f9fafb);
      border-top: 1px solid var(--border-color, #e5e7eb);
      border-bottom: 1px solid var(--border-color, #e5e7eb);
    }
    .faq-section h2 {
      font-size: 2.25rem;
      font-weight: 700;
      color: #111827;
      text-align: center;
      margin-top: 0;
      margin-bottom: 3rem;
    }
    .faq-accordion {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .faq-item {
      background: #ffffff;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
      transition: all 0.25s ease;
    }
    .faq-item:hover {
      box-shadow: 0 6px 12px -1px rgba(0,0,0,0.04);
      border-color: var(--primary-color, #007bff);
    }
    .faq-question {
      padding: 1.25rem 1.5rem;
      font-weight: 600;
      font-size: 1.1rem;
      color: #111827;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
    }
    .faq-question::after {
      content: '\\f078';
      font-family: 'Font Awesome 6 Free';
      font-weight: 900;
      font-size: 0.9rem;
      color: var(--primary-color, #007bff);
      transition: transform 0.3s ease;
    }
    .faq-item.active .faq-question::after {
      transform: rotate(180deg);
    }
    .faq-answer {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out, padding 0.3s ease-out;
      padding: 0 1.5rem;
      color: var(--text-muted, #4b5563);
      line-height: 1.6;
      font-size: 0.975rem;
    }
    .faq-item.active .faq-answer {
      max-height: 500px;
      padding: 0 1.5rem 1.5rem 1.5rem;
    }
  </style>
  <div class="container">
    <h2>Frequently Asked Questions</h2>
    <div class="faq-accordion">
      ${accordionItemsHtml.trim()}
    </div>
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const faqSection = document.getElementById('faq-section');
      if (faqSection) {
        const faqItems = faqSection.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
          const question = item.querySelector('.faq-question');
          question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            faqItems.forEach(otherItem => otherItem.classList.remove('active'));
            if (!isActive) {
              item.classList.add('active');
            }
          });
        });
      }
    });
  </script>
</section>`.trim();

            const schemaObjFaq = {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqsList.map(faq => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": faq.acceptedAnswer?.text || faq.answer
                }
              }))
            };

            faqSchemaScript = `
<script type="application/ld+json">
${JSON.stringify(schemaObjFaq, null, 2)}
</script>`.trim();
        } else {
            const generated = await generateFaqs(page.businessName, page.service, page.town, false, null);
            faqHtml = generated.faqHtml;
            faqSchemaScript = generated.faqSchemaScript;
        }

        localBusinessSchema += `\n${faqSchemaScript}`;

        // Generate dynamic Local Announcement Bar and SpecialAnnouncement schema
        let announcementHtml = '';
        if (client.announcement_text) {
          const now = new Date();
          const isExpired = client.announcement_expires_at && new Date(client.announcement_expires_at) < now;
          if (!isExpired) {
            let iconClass = 'fas fa-bullhorn';
            if (client.announcement_type === 'offer') iconClass = 'fas fa-tag';
            if (client.announcement_type === 'event') iconClass = 'fas fa-calendar-alt';

            let couponHtml = '';
            if (client.announcement_coupon_code) {
              couponHtml = ` <span class="coupon-badge" style="background: rgba(255,255,255,0.2); border: 1.5px dashed #ffffff; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 0.85rem; margin-left: 8px; font-weight: bold; letter-spacing: 0.05em; display: inline-block;">Code: ${client.announcement_coupon_code}</span>`;
            }

            announcementHtml = `
              <div class="local-announcement-bar" style="background: linear-gradient(90deg, ${primaryColorValue} 0%, #1e40af 100%); color: #ffffff; padding: 12px 20px; text-align: center; font-size: 0.95rem; font-weight: 600; position: relative; z-index: 1000; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-family: 'Inter', sans-serif; flex-wrap: wrap;">
                <span class="announcement-icon"><i class="${iconClass}"></i></span>
                <span class="announcement-text" style="letter-spacing: 0.01em;">${client.announcement_text}</span>
                ${couponHtml}
              </div>
            `.trim();

            const specialAnnouncementSchema = {
              "@context": "http://schema.org",
              "@type": "SpecialAnnouncement",
              "name": `Local Update from ${page.businessName}`,
              "text": client.announcement_text,
              "datePosted": client.announcement_updated_at || new Date().toISOString(),
              "expires": client.announcement_expires_at || null,
              "provider": {
                "@type": getSchemaType(page.service),
                "name": page.businessName,
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": page.town
                }
              }
            };

            localBusinessSchema += `\n<script type="application/ld+json">\n${JSON.stringify(specialAnnouncementSchema, null, 2)}\n</script>`;
          }
        }

        const testimonialsSectionHtml = renderTestimonialsSection(testimonials);

        const agencyLogoHtml = logoUrl ? `<img src="${logoUrl}" alt="${agencyName} Logo" style="max-height: 50px;" loading="lazy">` : page.businessName;

        const resolvedPhone = page.telephone || '';
        const resolvedPriceRange = page.priceRange || 'Standard';
        const resolvedOpeningHours = page.openingHours || 'Mo-Fr 09:00-17:00';
        const phoneCtaDisplay = page.telephone ? 'inline-block' : 'none';

        const domain = process.env.DOMAIN_URL || 'https://www.localseogen.com';
        const ogImageUrl = `${domain}/api/og-image?businessName=${encodeURIComponent(page.businessName)}&service=${encodeURIComponent(page.service)}&town=${encodeURIComponent(page.town)}&color=${encodeURIComponent(primaryColorValue)}`;

        const mapSectionHtml = renderMapSection(page.businessName, page.town, primaryColorValue, page.serviceRadius, page.latitude, page.longitude);

        let pageContent = template
            .replace(/{{businessName}}/g, page.businessName)
            .replace(/{{service}}/g, page.service)
            .replace(/{{town}}/g, page.town)
            .replace(/{{metaDescription}}/g, metaDescription)
            .replace(/{{ogDescription}}/g, ogDescription)
            .replace(/{{twitterDescription}}/g, twitterDescription)
            .replace(/{{ogImage}}/g, ogImageUrl)
            .replace(/{{primaryColor}}/g, primaryColorValue)
            .replace(/{{agencyLogo}}/g, agencyLogoHtml)
            .replace(/{{ai_content}}/g, aiContentValue)
            .replace(/{{service_slug}}/g, resolvedServiceSlug)
            .replace(/{{town_slug}}/g, resolvedTownSlug)
            .replace(/{{localBusinessSchema}}/g, localBusinessSchema)
            .replace(/{{testimonialsSection}}/g, testimonialsSectionHtml)
            .replace(/{{faqSection}}/g, faqHtml)
            .replace(/{{telephone}}/g, resolvedPhone)
            .replace(/{{priceRange}}/g, resolvedPriceRange)
            .replace(/{{openingHours}}/g, resolvedOpeningHours)
            .replace(/{{phoneCtaDisplay}}/g, phoneCtaDisplay)
            .replace(/{{mapSection}}/g, mapSectionHtml)
            .replace(/{{pageId}}/g, pageIdToFind);

        if (announcementHtml) {
            pageContent = pageContent.replace(/<body([^>]*)>/i, `<body$1>\n${announcementHtml}`);
        }

        let trackingScripts = '';
        if (client.ga_tracking_id) {
            trackingScripts += `\n<!-- Global site tag (gtag.js) - Google Analytics -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${client.ga_tracking_id}"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', '${client.ga_tracking_id}');\n</script>\n`;
        }
        if (client.fb_pixel_id) {
            trackingScripts += `\n<!-- Facebook Pixel Code -->\n<script>\n  !function(f,b,e,v,n,t,s)\n  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?\n  n.callMethod.apply(n,arguments):n.queue.push(arguments)};\n  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\n  n.queue=[];t=b.createElement(e);t.async=!0;\n  t.src=v;s=b.getElementsByTagName(e)[0];\n  s.parentNode.insertBefore(t,s)}(window, document,'script',\n  'https://connect.facebook.net/en_US/fbevents.js');\n  fbq('init', '${client.fb_pixel_id}');\n  fbq('track', 'PageView');\n</script>\n<noscript><img height="1" width="1" style="display:none"\n  src="https://www.facebook.com/tr?id=${client.fb_pixel_id}&ev=PageView&noscript=1"\n/></noscript>\n<!-- End Facebook Pixel Code -->\n`;
        }

        if (nearbyAreasHtml) {
            pageContent = pageContent.replace('<footer>', `${nearbyAreasHtml}\n<footer>`);
        }

        if (trackingScripts) {
            pageContent = pageContent.replace('</head>', `${trackingScripts}</head>`);
        }

        res.setHeader('Content-Type', 'text/html');
        res.send(pageContent);
    } catch (error) {
        await logError(error, 'Slug Handler - General Error', 'slug_error.log');
        return res.status(500).json({ message: 'Internal server error.' });
    }
};