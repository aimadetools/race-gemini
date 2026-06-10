// conversion-tracking.js - Google Ads and Meta Pixel conversion tracking for purchases

async function runConversionTracking() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
        console.warn('[Tracking] No session_id found in URL. Skipping conversion tracking.');
        return;
    }

    try {
        console.log('[Tracking] Fetching transaction details for session:', sessionId);
        const response = await fetch(`/api/get-session-details?session_id=${encodeURIComponent(sessionId)}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch session details: ${response.statusText}`);
        }

        const details = await response.json();
        const { amount, currency, transactionId, paymentStatus, productName } = details;

        if (paymentStatus !== 'paid') {
            console.log('[Tracking] Payment status is not paid. Skipping tracking.');
            return;
        }

        console.log('[Tracking] Purchase verified. Value:', amount, currency, 'Product:', productName);

        // Fetch configured tracking IDs from platform config
        const configResponse = await fetch('/api/tracking-config');
        if (!configResponse.ok) {
            console.warn('[Tracking] Could not retrieve tracking configuration.');
            return;
        }
        const config = await configResponse.json();
        const { gaId, pixelId, adsLabel } = config;

        // 1. Fire Google Ads / Google Analytics event
        if (gaId) {
            // Ensure gtag is loaded
            if (!window.gtag) {
                const script = document.createElement('script');
                script.async = true;
                script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
                document.head.appendChild(script);

                window.dataLayer = window.dataLayer || [];
                window.gtag = function() { window.dataLayer.push(arguments); };
                window.gtag('js', new Date());
                window.gtag('config', gaId);
            }

            // Fire standard event
            window.gtag('event', 'purchase', {
                transaction_id: transactionId,
                value: amount,
                currency: currency,
                items: [{
                    item_name: productName,
                    price: amount,
                    quantity: 1
                }]
            });
            console.log('[Tracking] Fired Google Analytics Purchase event.');

            // Fire Google Ads conversion if conversion label is set
            if (adsLabel) {
                window.gtag('event', 'conversion', {
                    send_to: `${gaId}/${adsLabel}`,
                    value: amount,
                    currency: currency,
                    transaction_id: transactionId
                });
                console.log('[Tracking] Fired Google Ads conversion event.');
            }
        }

        // 2. Fire Meta Pixel Purchase event
        if (pixelId) {
            if (!window.fbq) {
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

            window.fbq('track', 'Purchase', {
                value: amount,
                currency: currency,
                content_name: productName,
                transaction_id: transactionId
            });
            console.log('[Tracking] Fired Meta Pixel Purchase event.');
        }

    } catch (error) {
        console.error('[Tracking] Error executing conversion tracking:', error);
    }
}

document.addEventListener('DOMContentLoaded', runConversionTracking);
