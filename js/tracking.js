// js/tracking.js

/**
 * Tracks a user event by sending it to the API.
 * @param {string} eventName - The name of the event (e.g., 'page_view', 'button_click').
 * @param {Object} [eventData] - Optional, arbitrary data associated with the event.
 * @param {string} [userId] - Optional, the ID of the user performing the action.
 */
function trackEvent(eventName, eventData = {}, userId = null) {
  fetch('/api/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventName,
      userId,
      eventData,
    }),
  })
    .then(response => {
      if (!response.ok) {
        console.error('Failed to track event:', response.statusText);
      }
      return response.json();
    })
    .catch(error => {
      console.error('Error sending track event:', error);
    });

  // Track to Vercel Web Analytics if available
  if (typeof window !== 'undefined' && window.va) {
    try {
      window.va('event', { name: eventName, data: eventData });
    } catch (err) {
      console.error('Failed to send event to Vercel Analytics:', err);
    }
  }
}

// Track page-specific events on load and setup checkout initiation listeners
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  
  // Track page view event (default)
  trackEvent('page_view', { path });

  // Phase 3: Monetization page view events
  if (path.includes('pricing.html') || path === '/pricing') {
    trackEvent('view_pricing', { path });
  }

  if (path.includes('buy-credits.html') || path === '/buy-credits') {
    trackEvent('view_buy_credits', { path });
  }

  // --- Conversion Funnel Hooks for Tools ---

  // 1. Grid Scanner Conversion Tracking
  if (path.includes('grid-scanner.html') || path === '/grid-scanner') {
    const scanForm = document.getElementById('scan-form');
    if (scanForm) {
      scanForm.addEventListener('submit', () => {
        const businessName = document.getElementById('business-name')?.value;
        const city = document.getElementById('city')?.value;
        const service = document.getElementById('service')?.value;
        trackEvent('grid_scanner_submit', { businessName, city, service });
      });
    }
    const leadForm = document.getElementById('lead-form');
    if (leadForm) {
      leadForm.addEventListener('submit', () => {
        trackEvent('grid_scanner_lead_captured');
      });
    }
    const ctaGenerateBtn = document.getElementById('cta-generate-btn');
    if (ctaGenerateBtn) {
      ctaGenerateBtn.addEventListener('click', () => {
        trackEvent('grid_scanner_cta_clicked');
      });
    }
  }

  // 2. Competitor Gap Finder Conversion Tracking
  if (path.includes('competitor-gap.html') || path === '/competitor-gap') {
    const gapForm = document.getElementById('gap-form');
    if (gapForm) {
      gapForm.addEventListener('submit', () => {
        const userUrl = document.getElementById('user-url')?.value;
        const competitorUrl = document.getElementById('competitor-url')?.value;
        const city = document.getElementById('city')?.value;
        const service = document.getElementById('service')?.value;
        trackEvent('competitor_gap_submit', { userUrl, competitorUrl, city, service });
      });
    }
    const leadForm = document.getElementById('lead-form');
    if (leadForm) {
      leadForm.addEventListener('submit', () => {
        trackEvent('competitor_gap_lead_captured');
      });
    }
    const ctaGenerateBtn = document.getElementById('cta-generate-btn');
    if (ctaGenerateBtn) {
      ctaGenerateBtn.addEventListener('click', () => {
        trackEvent('competitor_gap_cta_clicked');
      });
    }
  }

  // 3. Schema Generator Conversion Tracking
  if (path.includes('schema-generator.html') || path === '/schema-generator') {
    const btnGeocode = document.getElementById('btn-geocode');
    if (btnGeocode) {
      btnGeocode.addEventListener('click', () => {
        const bizAddress = document.getElementById('biz-address')?.value;
        trackEvent('schema_geocode_clicked', { address: bizAddress });
      });
    }
    const btnCopy = document.getElementById('btn-copy');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        trackEvent('schema_copied');
      });
    }
    const btnDownload = document.getElementById('btn-download');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        trackEvent('schema_downloaded');
      });
    }
    const upsellBtn = document.querySelector('.upsell-btn');
    if (upsellBtn) {
      upsellBtn.addEventListener('click', () => {
        trackEvent('schema_upsell_clicked');
      });
    }
  }

  // Capture and track referral clicks
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  if (refCode) {
    // Store in localStorage for persistence across navigation until signup
    localStorage.setItem('referralCode', refCode);

    // Track click event once per session to prevent spamming click counts
    const sessionKey = `ref_click_tracked_${refCode}`;
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, 'true');
      fetch('/api/track-referral-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: refCode }),
      }).catch(err => console.error('Failed to track referral click:', err));
    }
  }

  // Show welcome banner for referred users
  showReferralBanner();
});

function showReferralBanner() {
  const refCode = localStorage.getItem('referralCode');
  if (!refCode) return;

  // Don't show if dismissed in this session
  if (sessionStorage.getItem('referral_banner_closed') === 'true') return;

  // Don't show on login/signup or internal/dashboard pages
  const path = window.location.pathname.toLowerCase();
  const excluded = ['/auth', '/dashboard', '/referral-dashboard', '/agency-dashboard', '/client-details', '/admin-'];
  if (excluded.some(p => path.includes(p))) return;

  // Check if banner is already on the page
  if (document.querySelector('.ref-banner-float')) return;

  // Create style element for glassmorphic design & smooth animations
  const style = document.createElement('style');
  style.innerHTML = `
    .ref-banner-float {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 320px;
      background: rgba(17, 24, 39, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 18px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      z-index: 9999;
      animation: refSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      font-family: 'Inter', sans-serif;
      text-align: left;
    }
    @keyframes refSlideUp {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .ref-banner-close {
      position: absolute;
      top: 10px;
      right: 12px;
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      transition: color 0.2s;
    }
    .ref-banner-close:hover {
      color: #fff;
    }
    .ref-banner-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      margin: 0 0 6px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ref-banner-text {
      font-size: 0.825rem;
      color: #d1d5db;
      margin: 0 0 12px 0;
      line-height: 1.4;
    }
    .ref-banner-btn {
      display: block;
      width: 100%;
      text-align: center;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #fff;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 8px 12px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
      transition: transform 0.2s, opacity 0.2s;
    }
    .ref-banner-btn:hover {
      transform: translateY(-1px);
      opacity: 0.95;
    }
    @media (max-width: 480px) {
      .ref-banner-float {
        left: 16px;
        right: 16px;
        bottom: 16px;
        width: auto;
      }
    }
  `;
  document.head.appendChild(style);

  // Create banner container
  const banner = document.createElement('div');
  banner.className = 'ref-banner-float';
  banner.innerHTML = `
    <button class="ref-banner-close" aria-label="Close banner">&times;</button>
    <div class="ref-banner-title">🎁 Referral Offer Activated</div>
    <p class="ref-banner-text">Your friend invited you to LocalLeads! Sign up today to claim <strong>5 free SEO page credits</strong> (no card required).</p>
    <a href="/auth.html" class="ref-banner-btn">Claim My 5 Credits</a>
  `;

  // Bind close button event
  banner.querySelector('.ref-banner-close').addEventListener('click', () => {
    sessionStorage.setItem('referral_banner_closed', 'true');
    banner.remove();
  });

  document.body.appendChild(banner);
}

// Track checkout initiation globally on any form submission targeting checkout
document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form && form.action && form.action.includes('/api/checkout')) {
    const creditPackIdInput = form.querySelector('input[name="creditPackId"]');
    const creditPackId = creditPackIdInput ? creditPackIdInput.value : 'unknown';
    const customCreditsInput = form.querySelector('input[name="customCredits"]');
    const eventData = { creditPackId };
    if (customCreditsInput) {
      eventData.customCredits = customCreditsInput.value;
    }
    trackEvent('checkout_initiated', eventData);
  }
});

// Track checkout initiation on buy button clicks globally
document.addEventListener('click', (e) => {
  const button = e.target.closest('.buy-button, .buy-wholesale-button');
  if (button) {
    const packId = button.dataset.packId || 'unknown';
    trackEvent('checkout_initiated', { creditPackId: packId });
  }
});
