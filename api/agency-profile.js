import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';
import slugify from 'slugify';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).send('<h1>Method Not Allowed</h1>');
  }

  const { slug } = req.query;

  if (!slug) {
    return res.status(400).send('<h1>Error: Missing agency slug</h1>');
  }

  try {
    const result = await query(
      'SELECT id, name, website, contact_name, email, personalization, city, slug, claimed_user_id FROM agency_directory WHERE slug = $1',
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('<h1>Agency Profile Not Found</h1><p>We could not find a registered profile for this agency. Check back later or browse our <a href="/directory.html">agency directory</a>.</p>');
    }

    const agency = result.rows[0];

    // Build Schema.org Structured Data
    const schema = {
      "@context": "http://schema.org",
      "@type": "ProfessionalService",
      "name": agency.name,
      "url": agency.website || `https://www.localseogen.com/agency/${agency.slug}`,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": agency.city,
        "addressCountry": "US"
      },
      "description": agency.personalization || `Top-rated local SEO and digital marketing agency serving ${agency.city}.`,
      "image": "https://www.localseogen.com/images/logo.svg",
      "brand": {
        "@type": "Brand",
        "name": "LocalLeads Partner Network",
        "logo": "https://www.localseogen.com/images/logo.svg"
      }
    };

    const isClaimed = agency.claimed_user_id !== null;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${agency.name} | Top Local SEO & Marketing Agency in ${agency.city}</title>
  <meta name="description" content="Read reviews, explore services, and contact ${agency.name} in ${agency.city}. Verified LocalLeads partner helping service businesses drive local traffic.">
  <meta name="keywords" content="${agency.name}, ${agency.city} SEO agency, local marketing ${agency.city}, white label local SEO, local lead generation">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${agency.name} | Top Local SEO & Marketing Agency in ${agency.city}">
  <meta property="og:description" content="Verified LocalLeads partner helping local service businesses dominate Google Search in ${agency.city}.">
  <meta property="og:image" content="https://www.localseogen.com/api/og-image?businessName=${encodeURIComponent(agency.name)}&service=SEO+Agency&town=${encodeURIComponent(agency.city)}&color=8b5cf6">
  <meta property="og:url" content="https://www.localseogen.com/agency/${agency.slug}">
  <meta name="twitter:card" content="summary_large_image">

  <!-- Styling -->
  <link href="/style.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  
  <style>
    :root {
      --primary-gradient: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      --card-bg: rgba(31, 41, 55, 0.65);
      --border-color: rgba(255, 255, 255, 0.08);
      --font-title: 'Outfit', sans-serif;
      --font-body: 'Plus Jakarta Sans', sans-serif;
    }

    body {
      font-family: var(--font-body);
      background-color: #0b0f19;
      color: #f3f4f6;
      margin: 0;
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }

    /* Hero section */
    .profile-hero {
      padding: 8rem 0 4rem;
      background: radial-gradient(circle at top, rgba(139, 92, 246, 0.15) 0%, rgba(11, 15, 25, 0) 60%);
      text-align: center;
      border-bottom: 1px solid var(--border-color);
    }

    .badge-verified {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      padding: 6px 16px;
      border-radius: 99px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1.5rem;
    }

    .badge-unclaimed {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      padding: 6px 16px;
      border-radius: 99px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1.5rem;
    }

    .profile-hero h1 {
      font-family: var(--font-title);
      font-size: 3rem;
      font-weight: 700;
      margin: 0 0 1rem;
      background: linear-gradient(to right, #fff, #9ca3af);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .profile-meta {
      display: flex;
      justify-content: center;
      gap: 20px;
      color: #9ca3af;
      font-size: 1.1rem;
      margin-bottom: 2rem;
    }

    .profile-meta span i {
      color: #8b5cf6;
      margin-right: 6px;
    }

    .hero-ctas {
      display: flex;
      justify-content: center;
      gap: 15px;
      flex-wrap: wrap;
    }

    /* Grid Layout */
    .profile-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 30px;
      padding: 4rem 0;
    }

    @media (max-width: 968px) {
      .profile-grid {
        grid-template-columns: 1fr;
      }
    }

    .profile-card {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 2.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
      margin-bottom: 30px;
    }

    .profile-card h2 {
      font-family: var(--font-title);
      font-size: 1.8rem;
      margin-top: 0;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .profile-card h2 i {
      color: #3b82f6;
    }

    /* Claim Box Banner */
    .claim-banner {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 30px;
    }

    .claim-banner h3 {
      margin-top: 0;
      color: #c084fc;
      font-family: var(--font-title);
      font-size: 1.4rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Interactive Demo Card */
    .demo-widget-container {
      background: rgba(17, 24, 39, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1.5rem;
      margin-top: 1.5rem;
    }

    .widget-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 0.75rem;
      margin-bottom: 1rem;
    }

    /* Global Header Override */
    header nav {
      background: rgba(11, 15, 25, 0.8) !important;
      backdrop-filter: blur(12px) !important;
      border-bottom: 1px solid var(--border-color) !important;
    }

    .button-primary {
      background: var(--primary-gradient);
      color: white;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: none;
      cursor: pointer;
    }

    .button-primary:hover {
      opacity: 0.95;
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
    }

    .button-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .button-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
    }

    .back-btn {
      color: #9ca3af;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2rem;
      transition: color 0.2s ease;
    }

    .back-btn:hover {
      color: white;
    }

  </style>

  <!-- Structured Data Schema -->
  <script type="application/ld+json">
    ${JSON.stringify(schema, null, 2)}
  </script>
</head>
<body>

  <!-- Header Section -->
  <header>
    <nav>
      <div style="max-width: 1200px; margin: 0 auto; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center;">
        <a href="/" style="display: flex; align-items: center; text-decoration: none;">
          <img src="/images/logo.svg" alt="LocalLeads Logo" style="height: 32px;">
        </a>
        <div style="display: flex; gap: 20px; align-items: center;">
          <a href="/directory.html" style="color: #9ca3af; text-decoration: none; font-size: 0.95rem; transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#9ca3af'">Agency Directory</a>
          <a href="/pricing.html" style="color: #9ca3af; text-decoration: none; font-size: 0.95rem; transition: color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#9ca3af'">Pricing</a>
          <a href="/auth.html" class="button-secondary" style="padding: 8px 18px; font-size: 0.9rem;">Sign In</a>
        </div>
      </div>
    </nav>
  </header>

  <!-- Hero -->
  <section class="profile-hero">
    <div class="container">
      <a href="/directory.html" class="back-btn"><i class="fas fa-arrow-left"></i> Back to Directory</a>
      <br>
      ${isClaimed 
        ? `<span class="badge-verified"><i class="fas fa-check-circle"></i> Claimed &amp; Verified Partner</span>` 
        : `<span class="badge-unclaimed"><i class="fas fa-exclamation-circle"></i> Unclaimed Profile</span>`
      }
      <h1>${agency.name}</h1>
      <div class="profile-meta">
        <span><i class="fas fa-map-marker-alt"></i> ${agency.city}</span>
        <span><i class="fas fa-link"></i> <a href="${agency.website || '#'}" target="_blank" rel="noopener noreferrer" style="color: #9ca3af; text-decoration: none;">${agency.website ? agency.website.replace('https://', '').replace('http://', '').split('/')[0] : 'Website'}</a></span>
      </div>
      <div class="hero-ctas">
        ${agency.website ? `<a href="${agency.website}" target="_blank" rel="noopener noreferrer" class="button-primary"><i class="fas fa-external-link-alt"></i> Visit Agency Website</a>` : ''}
        ${!isClaimed ? `<a href="/claim-profile.html?agency=${agency.slug}" class="button-secondary"><i class="fas fa-key"></i> Claim Profile</a>` : ''}
      </div>
    </div>
  </section>

  <!-- Content Grid -->
  <div class="container">
    <div class="profile-grid">
      
      <!-- Left Main Column -->
      <main>
        
        ${!isClaimed ? `
        <!-- Claim Banner Box -->
        <div class="claim-banner">
          <h3><i class="fas fa-gift"></i> Is this your agency?</h3>
          <p style="margin: 0.5rem 0 1.5rem; color: #d1d5db; font-size: 0.98rem;">
            Claim this verified listing to manage your local profile, update your service specialties, and deploy your 
            <strong>Free White-Label Local SEO Lead Capture Widget</strong> on your website. Captures leads, analyzes sitemaps, and suggests keywords.
          </p>
          <a href="/claim-profile.html?agency=${agency.slug}" class="button-primary"><i class="fas fa-unlock-alt"></i> Claim &amp; Unlock Widget</a>
        </div>
        ` : ''}

        <!-- Profile Analysis -->
        <div class="profile-card">
          <h2><i class="fas fa-chart-line"></i> Local SEO Performance Assessment</h2>
          <p style="color: #d1d5db; font-size: 1.05rem; line-height: 1.7; margin-bottom: 2rem;">
            ${agency.personalization || `${agency.name} is a leading digital marketing agency specializing in local search optimization and helping local services acquire more organic clients. Based out of ${agency.city}, they cater to contractors, plumbers, electricians, and home services brands seeking regional dominance.`}
          </p>
          
          <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 1.5rem;">
            <h4 style="margin: 0 0 0.75rem 0; color: #fff; font-size: 1.1rem;">Verified Capabilities</h4>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <span style="background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 6px; font-size: 0.88rem; border: 1px solid rgba(255,255,255,0.05);"><i class="fas fa-globe-americas" style="color: #3b82f6; margin-right: 6px;"></i> Local Landing Pages</span>
              <span style="background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 6px; font-size: 0.88rem; border: 1px solid rgba(255,255,255,0.05);"><i class="fas fa-map-marked-alt" style="color: #10b981; margin-right: 6px;"></i> GMB &amp; Maps Optimization</span>
              <span style="background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 6px; font-size: 0.88rem; border: 1px solid rgba(255,255,255,0.05);"><i class="fas fa-search" style="color: #f59e0b; margin-right: 6px;"></i> Local Rank Auditing</span>
              <span style="background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 6px; font-size: 0.88rem; border: 1px solid rgba(255,255,255,0.05);"><i class="fas fa-envelope-open-text" style="color: #ec4899; margin-right: 6px;"></i> B2B Lead Acquisition</span>
            </div>
          </div>
        </div>

        <!-- Partnership widget -->
        <div class="profile-card">
          <h2><i class="fas fa-terminal"></i> White-Label Interactive Widget Demo</h2>
          <p style="color: #9ca3af; font-size: 0.95rem; margin: 0 0 1.5rem 0;">
            See how the white-label lead capture widget functions on a partner agency's site. It allows clients to audit their SEO scores and instantly requests their email for follow-up report deliveries.
          </p>
          <div class="demo-widget-container">
            <div class="widget-preview-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></span>
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b;"></span>
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #10b981;"></span>
                <span style="color: #6b7280; font-size: 0.8rem; margin-left: 10px;">Audit Widget Preview</span>
              </div>
              <span style="color: #a78bfa; font-size: 0.85rem; font-weight: 600;">Powered by LocalLeads</span>
            </div>
            
            <!-- Audit Form Mockup -->
            <div id="mock-audit-form" style="padding: 1rem 0;">
              <div style="text-align: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 0.5rem 0; color: #fff; font-family: var(--font-title); font-size: 1.3rem;">Check Your Local SEO Score Instantly</h3>
                <p style="margin: 0; color: #9ca3af; font-size: 0.9rem;">Analyze how well your business ranks in surrounding towns.</p>
              </div>
              <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px; margin: 0 auto;">
                <input type="text" placeholder="Your Business Website" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 10px 14px; color: #fff; font-size: 0.95rem;" disabled>
                <input type="email" placeholder="Your Work Email" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 10px 14px; color: #fff; font-size: 0.95rem;" disabled>
                <button type="button" style="background: var(--primary-gradient); color: #fff; border: none; padding: 11px; border-radius: 6px; font-weight: 600; cursor: not-allowed;" disabled>Run Free SEO Scan</button>
              </div>
            </div>

          </div>
        </div>

      </main>

      <!-- Right Column Settings -->
      <aside>
        <div class="profile-card" style="padding: 2rem;">
          <h3 style="margin-top: 0; font-family: var(--font-title); font-size: 1.3rem; margin-bottom: 1rem;"><i class="fas fa-building" style="color:#8b5cf6;"></i> About Agency</h3>
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.95rem; display: flex; flex-direction: column; gap: 15px;">
            <li style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 10px;">
              <span style="color:#6b7280;">Location:</span>
              <span style="font-weight:600;">${agency.city}</span>
            </li>
            <li style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 10px;">
              <span style="color:#6b7280;">Specialty:</span>
              <span style="font-weight:600; color:#c084fc;">Local Search (SEO)</span>
            </li>
            <li style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 10px;">
              <span style="color:#6b7280;">Verification Status:</span>
              <span style="color:#10b981; font-weight:600;"><i class="fas fa-check-circle"></i> Active Listing</span>
            </li>
            <li style="display: flex; justify-content: space-between; padding-bottom: 10px;">
              <span style="color:#6b7280;">Partner Badge:</span>
              <span style="color:#f59e0b; font-weight:600;"><i class="fas fa-medal"></i> Premium Tier</span>
            </li>
          </ul>
        </div>

        <div class="profile-card" style="padding: 2rem; background: linear-gradient(180deg, rgba(31, 41, 55, 0.4) 0%, rgba(17, 24, 39, 0.4) 100%);">
          <h3 style="margin-top: 0; font-family: var(--font-title); font-size: 1.3rem; margin-bottom: 1rem;"><i class="fas fa-info-circle" style="color:#3b82f6;"></i> Need Custom Pages?</h3>
          <p style="font-size: 0.9rem; color: #9ca3af; margin-bottom: 1.5rem;">
            Generate optimized service area landing pages for every surrounding town in minutes. Increase search traffic and capture direct leads.
          </p>
          <a href="/generate.html" class="button-primary" style="width: 100%; box-sizing: border-box; justify-content: center;"><i class="fas fa-magic"></i> Generate Pages</a>
        </div>
      </aside>

    </div>
  </div>

  <!-- Footer Section -->
  <footer style="background: #080b12; border-top: 1px solid var(--border-color); padding: 4rem 0; color: #6b7280; font-size: 0.9rem;">
    <div class="container" style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 30px;">
      <div>
        <img src="/images/logo.svg" alt="LocalLeads Logo" style="height: 24px; margin-bottom: 1rem; filter: grayscale(1); opacity: 0.6;">
        <p style="margin: 0; max-width: 300px;">Get found in every town. Curated directory and lead generation builder for local marketing networks.</p>
      </div>
      <div style="display: flex; gap: 50px;">
        <div>
          <h5 style="color: #fff; margin: 0 0 1rem 0; font-size: 0.95rem;">Resources</h5>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
            <li><a href="/directory.html" style="color: #6b7280; text-decoration: none;">Agency Directory</a></li>
            <li><a href="/pricing.html" style="color: #6b7280; text-decoration: none;">Pricing Plans</a></li>
            <li><a href="/about.html" style="color: #6b7280; text-decoration: none;">About Us</a></li>
          </ul>
        </div>
        <div>
          <h5 style="color: #fff; margin: 0 0 1rem 0; font-size: 0.95rem;">Legal</h5>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
            <li><a href="/privacy.html" style="color: #6b7280; text-decoration: none;">Privacy Policy</a></li>
            <li><a href="/terms.html" style="color: #6b7280; text-decoration: none;">Terms of Service</a></li>
          </ul>
        </div>
      </div>
    </div>
    <div class="container" style="margin-top: 3rem; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 2rem; text-align: center;">
      <p style="margin: 0;">&copy; 2026 LocalLeads. All rights reserved. All agency trademarks belong to their respective owners.</p>
    </div>
  </footer>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    await logError(error, `Get Agency Profile Error for slug: ${slug}`);
    return res.status(500).send('<h1>Internal Server Error</h1><p>Something went wrong. Please try again later.</p>');
  }
}
