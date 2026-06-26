import fs from 'fs';
import path from 'path';
import slugify from 'slugify';
import { query } from '../db/index.js';
import { getFallbackMarketingCopy } from '../lib/fallback-copy.js';

// Setup slugify config to match generate-seo-pages.js
const slugifyConfig = { lower: true, strict: true };

// Compile a list of 20 high-value local service prospects
const prospects = [
  {
    businessName: 'Apex Plumbing Services',
    city: 'Boston',
    service: 'Plumbing',
    email: 'contact@apexplumbingboston.com'
  },
  {
    businessName: 'Summit HVAC Pros',
    city: 'Denver',
    service: 'HVAC',
    email: 'info@summithvacdenver.com'
  },
  {
    businessName: 'GreenLeaf Landscaping',
    city: 'Austin',
    service: 'Landscaping',
    email: 'office@greenleafaustin.net'
  },
  {
    businessName: 'BlueSky House Cleaning',
    city: 'Seattle',
    service: 'Cleaning',
    email: 'hello@blueskyseattleclean.com'
  },
  {
    businessName: 'Elite Roofing Solutions',
    city: 'Houston',
    service: 'Roofing',
    email: 'contact@eliteroofinghouston.com'
  },
  {
    businessName: 'PowerVolt Electrical',
    city: 'Chicago',
    service: 'Electrical',
    email: 'service@powervoltchicago.com'
  },
  {
    businessName: 'Sunstate Solar & Electrical',
    city: 'Phoenix',
    service: 'Solar',
    email: 'contact@sunstatephoenix.com'
  },
  {
    businessName: 'OceanBreeze HVAC',
    city: 'San Diego',
    service: 'HVAC',
    email: 'service@oceanbreezesd.com'
  },
  {
    businessName: 'Star Cleaners',
    city: 'Dallas',
    service: 'Cleaning',
    email: 'bookings@starcleanersdallas.com'
  },
  {
    businessName: 'Peachtree Tree Services',
    city: 'Atlanta',
    service: 'Tree Service',
    email: 'contact@peachtreetrees.com'
  },
  {
    businessName: 'Cascade Plumbers',
    city: 'Portland',
    service: 'Plumbing',
    email: 'hello@cascadeplumbingportland.com'
  },
  {
    businessName: 'Pioneer Landscaping',
    city: 'Salt Lake City',
    service: 'Landscaping',
    email: 'info@pioneerlandscapeslc.com'
  },
  {
    businessName: 'Valley Custom Roofing',
    city: 'Sacramento',
    service: 'Roofing',
    email: 'info@valleycustomroofing.com'
  },
  {
    businessName: 'Liberty Painters',
    city: 'Philadelphia',
    service: 'Painting',
    email: 'contact@libertypaintersphilly.com'
  },
  {
    businessName: 'Mile High Garage Doors',
    city: 'Denver',
    service: 'Garage Doors',
    email: 'service@milehighgaragedoors.com'
  },
  {
    businessName: 'Windy City Carpet Cleaners',
    city: 'Chicago',
    service: 'Carpet Cleaning',
    email: 'hello@windycitycarpet.com'
  },
  {
    businessName: 'Emerald City Pest Control',
    city: 'Seattle',
    service: 'Pest Control',
    email: 'info@emeraldcitypest.com'
  },
  {
    businessName: 'Lone Star Home Renovations',
    city: 'Dallas',
    service: 'Home Renovation',
    email: 'contact@lonestarhomerenovations.com'
  },
  {
    businessName: 'Golden Gate Electricians',
    city: 'San Francisco',
    service: 'Electrical',
    email: 'service@goldengateelectric.com'
  },
  {
    businessName: 'Sunshine State Pool Service',
    city: 'Miami',
    service: 'Pool Service',
    email: 'contact@sunshinestatepools.com'
  }
];

function generateLocalBusinessSchema(businessName, service, town) {
  const schema = {
    "@context": "http://schema.org",
    "@type": "LocalBusiness",
    "name": businessName,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": town
    },
    "hasMap": `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName + ' ' + town)}`,
    "url": `https://www.localseogen.com/${slugify(service, slugifyConfig)}-in-${slugify(town, slugifyConfig)}.html`,
    "telephone": "",
    "priceRange": "Standard",
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "17:00"
      }
    ],
    "description": `Expert ${service} services in ${town} by ${businessName}.`,
    "image": "https://www.localseogen.com/images/logo.svg",
    "areaServed": {
      "@type": "State",
      "name": town
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": `${service} Services`,
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": `Residential ${service}`,
            "description": `Professional residential ${service} installation, maintenance, and repair services in ${town}.`
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": `Commercial ${service}`,
            "description": `Reliable commercial ${service} systems setup, inspections, and customized solutions for businesses in ${town}.`
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": `Emergency ${service} Service`,
            "description": `Fast-response emergency ${service} troubleshooting and repairs available in the ${town} region.`
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": `${service} Inspection & Diagnostics`,
            "description": `Thorough inspection, diagnostics, and preventative care for all ${service} setups in ${town}.`
          }
        }
      ]
    }
  };
  return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`;
}

async function main() {
  console.log('Loading template...');
  const templatePath = path.join(process.cwd(), 'page-template.html');
  const template = fs.readFileSync(templatePath, 'utf8');

  console.log('Preparing target output directories...');
  const outputDir = path.join(process.cwd(), 'generated-seo-pages');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const csvRows = ['Business Name,City,Service Type,Email,Sent'];

  for (const prospect of prospects) {
    const { businessName, city, service, email } = prospect;
    const serviceSlug = slugify(service, slugifyConfig);
    const townSlug = slugify(city, slugifyConfig);
    const businessSlug = slugify(businessName, slugifyConfig);

    const fileName = `${serviceSlug}-in-${townSlug}-${businessSlug}.html`;
    const pageSlug = `${serviceSlug}-in-${townSlug}-${businessSlug}`;
    const filePath = path.join(outputDir, fileName);

    console.log(`Generating preview page for ${businessName} in ${city}...`);

    const aiContent = getFallbackMarketingCopy(businessName, service, city);
    const metaDescription = `Get expert ${service} in ${city} from ${businessName}. We provide top-quality ${service} with reliable service. Contact us today for a free quote!`;
    const ogDescription = metaDescription;
    const twitterDescription = metaDescription;
    const localBusinessSchema = generateLocalBusinessSchema(businessName, service, city);

    let pageContent = template
      .replace(/{{businessName}}/g, businessName)
      .replace(/{{service}}/g, service)
      .replace(/{{town}}/g, city)
      .replace(/{{primaryColor}}/g, '#007bff')
      .replace(/{{ai_content}}/g, aiContent)
      .replace(/{{metaDescription}}/g, metaDescription)
      .replace(/{{ogDescription}}/g, ogDescription)
      .replace(/{{twitterDescription}}/g, twitterDescription)
      .replace(/{{service_slug}}/g, serviceSlug)
      .replace(/{{town_slug}}/g, townSlug)
      .replace(/{{localBusinessSchema}}/g, localBusinessSchema)
      .replace(/{{telephone}}/g, '')
      .replace(/{{priceRange}}/g, 'Standard')
      .replace(/{{openingHours}}/g, 'Mo-Fr 09:00-17:00')
      .replace(/{{phoneCtaDisplay}}/g, 'none')
      .replace(/{{agencyLogo}}/g, businessName);

    pageContent = pageContent.replace(/{{pageId}}/g, `static-seo-page-${serviceSlug}-${townSlug}`);

    // Write file locally
    fs.writeFileSync(filePath, pageContent, 'utf8');

    // Save to Database
    console.log(`Saving page ${pageSlug} to database...`);
    await query(
      `INSERT INTO seo_pages (file_name, slug, content, user_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP`,
      [fileName, pageSlug, pageContent, null]
    );

    // Prepare CSV Row
    // If the fields contain commas, escape them
    const escapeCsv = (val) => {
      if (val.includes(',')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    csvRows.push(`${escapeCsv(businessName)},${escapeCsv(city)},${escapeCsv(service)},${escapeCsv(email)},false`);
  }

  // Write to outreach-targets.csv
  const csvPath = path.join(process.cwd(), 'outreach-targets.csv');
  fs.writeFileSync(csvPath, csvRows.join('\n') + '\n', 'utf8');
  console.log(`Successfully wrote targets to ${csvPath}`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
