function trackEvent(pageId, eventType, elementId = null) {
    fetch('/api/track', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageId, eventType, elementId }),
    }).then(response => {
        if (!response.ok) {
            console.error('Tracking failed:', response.statusText);
        }
    }).catch(error => {
        console.error('Tracking error:', error);
    });
}

// Track page view on load
document.addEventListener('DOMContentLoaded', () => {
    // Determine pageId based on current path
    const path = window.location.pathname;
    let pageId;

    if (path === '/') {
        pageId = 'index';
    } else if (path.startsWith('/blog/')) {
        pageId = 'blog_post_' + path.split('/').pop().replace('.html', '');
    } else {
        pageId = path.replace('.html', '').replace('/', '');
    }

    trackEvent(pageId, 'page_view');

    // Add event listeners for buttons

    // index.html
    const heroButton = document.getElementById('hero-button');
    if (heroButton) {
        heroButton.addEventListener('click', () => trackEvent('index', 'button_click', 'hero-button-generate'));
    }

    const heroButtonMidPage = document.getElementById('hero-button-generate'); // This ID is already on index.html but was named "hero-button" initially.
    if (heroButtonMidPage) {
        heroButtonMidPage.addEventListener('click', () => trackEvent('index', 'button_click', 'hero-button-generate-mid-page'));
    }

    const agencyPartnershipsButton = document.querySelector('.agency-callout .button');
    if (agencyPartnershipsButton) {
        agencyPartnershipsButton.addEventListener('click', () => trackEvent('index', 'button_click', 'agency-partnerships-button'));
    }

    // Sticky CTA Bar buttons (present on many pages, including index)
    const stickyCtaBar = document.querySelector('.sticky-cta-bar');
    if (stickyCtaBar) {
        const stickyGenerateButton = stickyCtaBar.querySelector('a[href="generate.html"]');
        if (stickyGenerateButton) {
            stickyGenerateButton.addEventListener('click', () => trackEvent(pageId, 'button_click', 'sticky-cta-generate'));
        }
        const stickyAuditButton = stickyCtaBar.querySelector('a[href="audit.html"]');
        if (stickyAuditButton) {
            stickyAuditButton.addEventListener('click', () => trackEvent(pageId, 'button_click', 'sticky-cta-audit'));
        }
    }


    // generate.html (assuming a button with ID 'generate-pages-button' exists)
    const generatePagesButton = document.getElementById('generate-pages-button');
    if (generatePagesButton) {
        generatePagesButton.addEventListener('click', () => trackEvent('generate', 'button_click', 'generate-pages-button'));
    }

    const buyMoreCreditsLink = document.getElementById('buy-more-credits-link');
    if (buyMoreCreditsLink) {
        buyMoreCreditsLink.addEventListener('click', () => trackEvent('generate', 'button_click', 'buy-more-credits-link'));
    }

    // buy-credits.html (assuming buttons with class 'buy-credit-pack' exist)
    document.querySelectorAll('.buy-credit-pack').forEach(button => {
        button.addEventListener('click', () => {
            const packId = button.dataset.packId; // Assuming data-pack-id attribute
            trackEvent('buy_credits', 'button_click', `buy-credit-pack-${packId}`);
        });
    });

    // blog post CTA (class blog-cta)
    const blogCta = document.querySelector('.blog-cta');
    if (blogCta) {
        const blogCtaGenerate = blogCta.querySelector('a[href="../generate.html"]');
        if (blogCtaGenerate) {
            blogCtaGenerate.addEventListener('click', () => trackEvent(pageId, 'button_click', 'blog-cta-generate'));
        }
        const blogCtaAudit = blogCta.querySelector('a[href="../audit.html"]');
        if (blogCtaAudit) {
            blogCtaAudit.addEventListener('click', () => trackEvent(pageId, 'button_click', 'blog-cta-audit'));
        }
    }

    // Main navigation links (can track clicks on these too)
    document.querySelectorAll('#nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            const linkText = link.textContent.trim().toLowerCase().replace(/\s+/g, '-');
            trackEvent(pageId, 'navigation_click', `nav-${linkText}`);
        });
    });

});
