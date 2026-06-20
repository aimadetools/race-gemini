import { query } from '../db/index.js';
import slugify from 'slugify';

function calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return Infinity;
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return Infinity;
    if (lat1 === lat2 && lon1 === lon2) return 0;
    
    const radlat1 = Math.PI * lat1 / 180;
    const radlat2 = Math.PI * lat2 / 180;
    const theta = lon1 - lon2;
    const radtheta = Math.PI * theta / 180;
    
    let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) dist = 1;
    dist = Math.acos(dist);
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.1515; // miles
    return dist;
}

export async function generateSiloLinks(userId, currentPageId, service, town, currentLat, currentLng, siloType = 'proximity', siloLimit = 5, isCustomDomain = false, resolvedClientId = '') {
    if (siloType === 'none') {
        return '';
    }

    // 1. Fetch all pages for this user and service
    const pagesResult = await query(
        `SELECT id, file_name, service, town, latitude, longitude, created_at 
         FROM seo_pages 
         WHERE user_id = $1 AND service = $2
         ORDER BY town ASC`,
        [userId, service]
    );

    const allPages = pagesResult.rows || [];
    if (allPages.length <= 1) {
        return ''; // No other pages to link to
    }

    let selectedPages = [];

    const parsedCurrentLat = currentLat ? parseFloat(currentLat) : null;
    const parsedCurrentLng = currentLng ? parseFloat(currentLng) : null;

    if (siloType === 'proximity' && parsedCurrentLat !== null && parsedCurrentLng !== null && !isNaN(parsedCurrentLat) && !isNaN(parsedCurrentLng)) {
        // Calculate distance to all other pages and sort
        const otherPages = allPages.filter(p => p.id !== currentPageId);
        
        otherPages.forEach(p => {
            const plat = p.latitude ? parseFloat(p.latitude) : null;
            const plng = p.longitude ? parseFloat(p.longitude) : null;
            p.distance = calculateDistance(parsedCurrentLat, parsedCurrentLng, plat, plng);
        });

        // Sort by distance (ascending). Pages without coordinates will have distance Infinity and be at the end
        otherPages.sort((a, b) => a.distance - b.distance);
        selectedPages = otherPages.slice(0, siloLimit);
    } 
    else if (siloType === 'loop') {
        // Circular Loop Silo
        allPages.sort((a, b) => a.town.localeCompare(b.town));
        const currentIndex = allPages.findIndex(p => p.id === currentPageId);
        
        if (currentIndex !== -1) {
            for (let i = 1; i <= siloLimit; i++) {
                if (selectedPages.length >= allPages.length - 1) break;
                const nextIndex = (currentIndex + i) % allPages.length;
                if (nextIndex !== currentIndex) {
                    selectedPages.push(allPages[nextIndex]);
                }
            }
        } else {
            selectedPages = allPages.filter(p => p.id !== currentPageId).slice(0, siloLimit);
        }
    } 
    else if (siloType === 'hub_and_spoke') {
        // Hub & Spoke Silo
        const otherPages = allPages.filter(p => p.id !== currentPageId);
        selectedPages = otherPages.slice(0, Math.max(1, siloLimit - 1));
    } 
    else {
        // Fallback (or proximity with no coordinates)
        const otherPages = allPages.filter(p => p.id !== currentPageId);
        otherPages.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        selectedPages = otherPages.slice(0, siloLimit);
    }

    if (selectedPages.length === 0) {
        return '';
    }

    let linksHtml = '';

    // If hub_and_spoke, inject the central Hub (domain home page) link first
    if (siloType === 'hub_and_spoke') {
        const homeUrl = isCustomDomain ? '/' : `/${resolvedClientId}/`;
        linksHtml += `
      <a class="nearby-areas-link hub-link" href="${homeUrl}">
        <i class="fas fa-home"></i>
        <span>${service} Home Directory</span>
      </a>`;
    }

    for (const row of selectedPages) {
        const rowServiceSlug = slugify(row.service, { lower: true, strict: true });
        const rowTownSlug = slugify(row.town, { lower: true, strict: true });
        
        // Relative URL matches WordPress subfolders, custom domain roots, and fallback subpaths
        const linkUrl = `${rowServiceSlug}-in-${rowTownSlug}.html`;
        
        linksHtml += `
      <a class="nearby-areas-link" href="${linkUrl}">
        <i class="fas fa-map-marker-alt"></i>
        <span>${row.service} in ${row.town}</span>
      </a>`;
    }

    const titleText = siloType === 'proximity' 
        ? 'Nearby Service Areas' 
        : (siloType === 'loop' ? 'Service Area Network' : 'Service Areas Directory');

    return `
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
    .nearby-areas-link.hub-link {
      font-weight: 700;
      border-right: 1px solid var(--border-color, #e5e7eb);
      padding-right: 10px;
    }
  </style>
  <div class="container">
    <h3>${titleText}</h3>
    <div class="nearby-grid">
      ${linksHtml.trim()}
    </div>
  </div>
</section>
`;
}
