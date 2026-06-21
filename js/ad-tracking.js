// js/ad-tracking.js - UTM and conversion tracking helpers for paid campaigns

(function() {
    // 1. Parse UTM parameters from URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const trackingParams = {
        utm_source: urlParams.get('utm_source'),
        utm_medium: urlParams.get('utm_medium'),
        utm_campaign: urlParams.get('utm_campaign'),
        utm_term: urlParams.get('utm_term'),
        utm_content: urlParams.get('utm_content'),
        gclid: urlParams.get('gclid'),
        fbclid: urlParams.get('fbclid'),
        ad_niche: urlParams.get('ad_niche') || (
            window.location.pathname.includes('plumb') ? 'plumbers' : 
            window.location.pathname.includes('clean') ? 'cleaners' : 
            window.location.pathname.includes('landscap') ? 'landscapers' : null
        )
    };

    // Store present tracking params to localStorage
    for (const [key, val] of Object.entries(trackingParams)) {
        if (val) {
            localStorage.setItem(key, val);
        }
    }

    // Retrieve stored tracking params from localStorage
    function getStoredTrackingParams() {
        const stored = {};
        const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ad_niche'];
        keys.forEach(k => {
            const v = localStorage.getItem(k);
            if (v) stored[k] = v;
        });
        return stored;
    }

    // 2. Fetch tracking config from serverless API and initialize gtag/fbq if enabled
    async function initThirdPartyTracking() {
        try {
            const res = await fetch('/api/tracking-config');
            if (!res.ok) return;
            const config = await res.json();
            const { gaId, pixelId } = config;

            const stored = getStoredTrackingParams();

            // Load Google Analytics/Google Ads Global Site Tag
            if (gaId && !window.gtag) {
                const script = document.createElement('script');
                script.async = true;
                script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
                document.head.appendChild(script);

                window.dataLayer = window.dataLayer || [];
                window.gtag = function() { window.dataLayer.push(arguments); };
                window.gtag('js', new Date());
                window.gtag('config', gaId);

                // Fire custom config with niche details
                if (stored.ad_niche || stored.utm_campaign) {
                    window.gtag('event', 'page_view', {
                        campaign_niche: stored.ad_niche || '',
                        ad_gclid: stored.gclid || ''
                    });
                }
            }

            // Load Facebook Pixel
            if (pixelId && !window.fbq) {
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                
                window.fbq('init', pixelId);
                window.fbq('track', 'PageView');
            }
        } catch (e) {
            console.warn('[AdTracking] Error initializing third-party tracking:', e);
        }
    }

    // 3. Log event to database user_events via api/track
    async function logTrackingEvent(eventName, additionalData = {}) {
        const stored = getStoredTrackingParams();
        const payload = {
            eventName,
            eventData: {
                ...stored,
                ...additionalData,
                referrer: document.referrer,
                path: window.location.pathname
            }
        };

        try {
            await fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn('[AdTracking] Failed to log event:', e);
        }
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        initThirdPartyTracking();

        // If landing on a campaign page, log ad landing event
        if (window.location.pathname.includes('landing-') || urlParams.has('utm_campaign') || urlParams.has('gclid')) {
            logTrackingEvent('ad_landing');
        }
    });

    // Expose helpers globally
    window.AdTracking = {
        getParams: getStoredTrackingParams,
        logEvent: logTrackingEvent
    };
})();
