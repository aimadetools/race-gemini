

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

    trackEvent('page_view', { pageId: pageId, path: path });

    // Add event listeners for buttons

    // index.html
    const heroButton = document.getElementById('hero-button');
    if (heroButton) {
        heroButton.addEventListener('click', () => trackEvent('button_click', { pageId: 'index', elementId: 'hero-button-generate' }));
    }

    const heroButtonMidPage = document.getElementById('hero-button-generate'); // This ID is already on index.html but was named "hero-button" initially.
    if (heroButtonMidPage) {
        heroButtonMidPage.addEventListener('click', () => trackEvent('button_click', { pageId: 'index', elementId: 'hero-button-generate-mid-page' }));
    }

    const agencyPartnershipsButton = document.querySelector('.agency-callout .button');
    if (agencyPartnershipsButton) {
        agencyPartnershipsButton.addEventListener('click', () => trackEvent('button_click', { pageId: 'index', elementId: 'agency-partnerships-button' }));
    }

    // Sticky CTA Bar buttons (present on many pages, including index)
    const stickyCtaBar = document.querySelector('.sticky-cta-bar');
    if (stickyCtaBar) {
        const stickyGenerateButton = stickyCtaBar.querySelector('a[href="generate.html"]');
        if (stickyGenerateButton) {
            stickyGenerateButton.addEventListener('click', () => trackEvent('button_click', { pageId: pageId, elementId: 'sticky-cta-generate' }));
        }
        const stickyAuditButton = stickyCtaBar.querySelector('a[href="audit.html"]');
        if (stickyAuditButton) {
            stickyAuditButton.addEventListener('click', () => trackEvent('button_click', { pageId: pageId, elementId: 'sticky-cta-audit' }));
        }
    }


    // generate.html (assuming a button with ID 'generate-pages-button' exists)
    const generatePagesButton = document.getElementById('generate-pages-button');
    if (generatePagesButton) {
        generatePagesButton.addEventListener('click', () => trackEvent('button_click', { pageId: 'generate', elementId: 'generate-pages-button' }));
    }

    const buyMoreCreditsLink = document.getElementById('buy-more-credits-link');
    if (buyMoreCreditsLink) {
        buyMoreCreditsLink.addEventListener('click', () => trackEvent('button_click', { pageId: 'generate', elementId: 'buy-more-credits-link' }));
    }

    // buy-credits.html (assuming buttons with class 'buy-credit-pack' exist)
    document.querySelectorAll('.buy-credit-pack').forEach(button => {
        button.addEventListener('click', () => {
            const packId = button.dataset.packId; // Assuming data-pack-id attribute
            trackEvent('button_click', { pageId: 'buy_credits', elementId: `buy-credit-pack-${packId}` });
        });
    });

    // blog post CTA (class blog-cta)
    const blogCta = document.querySelector('.blog-cta');
    if (blogCta) {
        const blogCtaGenerate = blogCta.querySelector('a[href="../generate.html"]');
        if (blogCtaGenerate) {
            blogCtaGenerate.addEventListener('click', () => trackEvent('button_click', { pageId: pageId, elementId: 'blog-cta-generate' }));
        }
        const blogCtaAudit = blogCta.querySelector('a[href="../audit.html"]');
        if (blogCtaAudit) {
            blogCtaAudit.addEventListener('click', () => trackEvent('button_click', { pageId: pageId, elementId: 'blog-cta-audit' }));
        }
    }

    // Main navigation links (can track clicks on these too)
    document.querySelectorAll('#nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            const linkText = link.textContent.trim().toLowerCase().replace(/\s+/g, '-');
            trackEvent('navigation_click', { pageId: pageId, elementId: `nav-${linkText}` });
        });
    });

});
