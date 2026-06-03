import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { query } from '../db/index.js';

// Custom slugify matching Python logic
function slugify(text) {
  if (!text) return "";
  return text.toLowerCase()
             .replace(/ /g, '-')
             .replace(/[^a-z0-9-]/g, '');
}

// Simple manual CSV parser that handles quotes
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const values = parseCSVLine(line);
    if (values.length < headers.length) continue;

    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index];
    });
    records.push(record);
  }
  return records;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function populate() {
  try {
    console.log("Loading page-template.html...");
    const templatePath = path.join(process.cwd(), 'page-template.html');
    const template = fs.readFileSync(templatePath, 'utf8');

    console.log("Loading outreach CSV data...");
    const csvPath = path.join(process.cwd(), 'scratch', 'old-targets.csv');
    if (!fs.existsSync(csvPath)) {
      console.error(`Error: CSV file not found at ${csvPath}. Run the git show command first.`);
      return;
    }
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const records = parseCSV(csvContent);

    console.log(`Loaded ${records.length} targets. Processing and inserting into db...`);

    let count = 0;
    for (const record of records) {
      const businessName = record['Business Name'];
      const city = record['City'];
      const serviceType = record['Service Type'];

      if (!businessName || !city || !serviceType) {
        console.log("Skipping invalid record:", record);
        continue;
      }

      const businessSlug = slugify(businessName);
      const citySlug = slugify(city);
      const serviceSlug = slugify(serviceType);

      const metaDescription = `Get expert ${serviceType} in ${city} from ${businessName}. We provide top-quality ${serviceType} with reliable service. Contact us today for a free quote!`;
      const localBusinessSchema = `
<script type="application/ld+json">
{
  "@context": "http://schema.org",
  "@type": "LocalBusiness",
  "name": "${businessName}",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "${city}"
  },
  "url": "https://www.localseogen.com/generated-seo-pages/${serviceSlug}-in-${citySlug}-${businessSlug}.html",
  "description": "Expert ${serviceType} services in ${city} by ${businessName}."
}
</script>
      `.trim();

      const aiContent = `<p>Looking for reliable ${serviceType} in ${city}? ${businessName} is your trusted local expert. We are dedicated to providing top-quality service and ensuring customer satisfaction in ${city}. Our team at ${businessName} specializes in ${serviceType.toLowerCase()} and is ready to help you with all your needs. Contact us today for a free consultation or to schedule an appointment!</p>`;
      const primaryColor = '#007bff';

      let pageContent = template
          .replace(/{{businessName}}/g, businessName)
          .replace(/{{service}}/g, serviceType)
          .replace(/{{town}}/g, city)
          .replace(/{{primaryColor}}/g, primaryColor)
          .replace(/{{ai_content}}/g, aiContent)
          .replace(/{{metaDescription}}/g, metaDescription)
          .replace(/{{ogDescription}}/g, metaDescription)
          .replace(/{{twitterDescription}}/g, metaDescription)
          .replace(/{{service_slug}}/g, serviceSlug)
          .replace(/{{town_slug}}/g, citySlug)
          .replace(/{{localBusinessSchema}}/g, localBusinessSchema);

      // Insert for fileName serviceSlug-in-citySlug-businessSlug.html
      const fileNameLong = `${serviceSlug}-in-${citySlug}-${businessSlug}.html`;
      const slugLong = `${serviceSlug}-in-${citySlug}-${businessSlug}`;
      let pageContentLong = pageContent.replace(/{{pageId}}/g, `static-seo-page-${serviceSlug}-${citySlug}`);

      await query(
          `INSERT INTO seo_pages (file_name, slug, content)
           VALUES ($1, $2, $3)
           ON CONFLICT (slug) DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP`,
          [fileNameLong, slugLong, pageContentLong]
      );

      // Also insert for fileName serviceSlug-in-citySlug.html (fallback format)
      const fileNameShort = `${serviceSlug}-in-${citySlug}.html`;
      const slugShort = `${serviceSlug}-in-${citySlug}`;
      let pageContentShort = pageContent.replace(/{{pageId}}/g, `static-seo-page-${serviceSlug}-${citySlug}`);

      await query(
          `INSERT INTO seo_pages (file_name, slug, content)
           VALUES ($1, $2, $3)
           ON CONFLICT (slug) DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP`,
          [fileNameShort, slugShort, pageContentShort]
      );

      console.log(`- Inserted pages for ${businessName} (${fileNameLong} & ${fileNameShort})`);
      count++;
    }

    console.log(`Success! Populated database with ${count * 2} sample SEO pages.`);
  } catch (error) {
    console.error("Error populating database:", error);
  }
}

populate();
