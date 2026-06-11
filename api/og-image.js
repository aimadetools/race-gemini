import slugify from 'slugify';

// Helper function to escape XML entities to avoid malformed SVG rendering
function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

// Helper function to validate hex colors
function validateColor(color) {
    if (!color) return '#3b82f6';
    const cleanColor = color.trim().replace(/^#/, '');
    if (/^[0-9A-F]{6}$/i.test(cleanColor) || /^[0-9A-F]{3}$/i.test(cleanColor)) {
        return '#' + cleanColor;
    }
    return '#3b82f6';
}

export default async function handler(req, res) {
    const { businessName = 'LocalLeads Service', service = 'Premium Service', town = 'Your Area', color = '#3b82f6' } = req.query;

    const safeBusinessName = escapeXml(businessName);
    const safeService = escapeXml(service);
    const safeTown = escapeXml(town);
    const themeColor = validateColor(color);

    // Dynamic sizing helper to prevent text overlap in SVG
    const maxLen = Math.max(safeService.length, safeTown.length);
    let titleFontSize = 56;
    let titleLineSpacing = 68;
    if (maxLen > 30) {
        titleFontSize = 38;
        titleLineSpacing = 48;
    } else if (maxLen > 20) {
        titleFontSize = 46;
        titleLineSpacing = 56;
    }

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f19" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${themeColor}" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
    </pattern>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.5" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />
  <rect width="1200" height="630" fill="url(#grid)" />

  <!-- Abstract decorative shapes -->
  <circle cx="1100" cy="100" r="250" fill="url(#brandGrad)" opacity="0.15" filter="blur(40px)" />
  <circle cx="100" cy="550" r="200" fill="#2563eb" opacity="0.1" filter="blur(30px)" />

  <!-- Glassmorphic Container/Card -->
  <rect x="80" y="80" width="1040" height="470" rx="24" fill="rgba(17, 24, 39, 0.6)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="2" filter="url(#shadow)" />

  <!-- Header Accent Line -->
  <path d="M 80 80 L 1120 80" stroke="url(#brandGrad)" stroke-width="4" stroke-linecap="round" />

  <!-- Brand badge -->
  <g transform="translate(130, 140)">
    <rect x="0" y="0" width="160" height="36" rx="18" fill="rgba(255, 255, 255, 0.06)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1" />
    <circle cx="20" cy="18" r="6" fill="${themeColor}" />
    <text x="35" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#e5e7eb" letter-spacing="1">LOCALLEADS</text>
  </g>

  <!-- Main heading: Service in Town -->
  <text x="130" y="250" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${titleFontSize}" font-weight="800" fill="#ffffff" letter-spacing="-1">
    Looking for ${safeService}?
  </text>
  <text x="130" y="${250 + titleLineSpacing}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${titleFontSize}" font-weight="800" fill="#ffffff" letter-spacing="-1">
    Top Service in <tspan fill="url(#brandGrad)">${safeTown}</tspan>
  </text>

  <!-- Business Name / Provider Subheading -->
  <text x="130" y="${250 + (titleLineSpacing * 2) + 20}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="500" fill="#9ca3af">
    Provided by <tspan fill="#ffffff" font-weight="700">${safeBusinessName}</tspan>
  </text>

  <!-- Features Badge / Rating -->
  <g transform="translate(130, 470)">
    <!-- Star Icons -->
    <path d="M0 -7 L2 -2 L7 -2 L3 1 L5 6 L0 3 L-5 6 L-3 1 L-7 -2 L-2 -2 Z" fill="#fbbf24" transform="translate(10, 10)" />
    <path d="M0 -7 L2 -2 L7 -2 L3 1 L5 6 L0 3 L-5 6 L-3 1 L-7 -2 L-2 -2 Z" fill="#fbbf24" transform="translate(30, 10)" />
    <path d="M0 -7 L2 -2 L7 -2 L3 1 L5 6 L0 3 L-5 6 L-3 1 L-7 -2 L-2 -2 Z" fill="#fbbf24" transform="translate(50, 10)" />
    <path d="M0 -7 L2 -2 L7 -2 L3 1 L5 6 L0 3 L-5 6 L-3 1 L-7 -2 L-2 -2 Z" fill="#fbbf24" transform="translate(70, 10)" />
    <path d="M0 -7 L2 -2 L7 -2 L3 1 L5 6 L0 3 L-5 6 L-3 1 L-7 -2 L-2 -2 Z" fill="#fbbf24" transform="translate(90, 10)" />
    
    <text x="115" y="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" fill="#e5e7eb">Top-Rated Local Service</text>
  </g>

  <!-- CTA Box (Right Aligned) -->
  <g transform="translate(850, 420)">
    <rect x="0" y="0" width="220" height="60" rx="12" fill="url(#brandGrad)" filter="url(#shadow)" />
    <text x="110" y="35" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="#ffffff" text-anchor="middle">Get a Free Quote</text>
  </g>
</svg>
`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(svg);
}
