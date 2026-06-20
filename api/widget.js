import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { clientId, theme = 'glassmorphic', layout = 'badge', type = 'service-area' } = req.query;

    if (!clientId) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.status(200).send('/* LocalLeads Widget: Missing clientId parameter */');
    }

    const parsedClientId = parseInt(clientId, 10);
    if (isNaN(parsedClientId)) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.status(200).send('/* LocalLeads Widget: Invalid clientId parameter */');
    }

    // Default mock fallback reviews if the business has no real reviews yet
    const fallbackReviews = [
        {
            author_name: "James Anderson",
            rating: 5,
            review_text: "Absolutely fantastic service. They responded quickly to my emergency, fixed the issue efficiently, and were very professional throughout.",
            review_date: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
            author_avatar: null
        },
        {
            author_name: "Sarah Miller",
            rating: 5,
            review_text: "Highly recommended! Honest pricing, prompt arrival, and excellent workmanship. They explained everything clearly.",
            review_date: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
            author_avatar: null
        },
        {
            author_name: "Robert Taylor",
            rating: 5,
            review_text: "Very reliable local business. The team was courteous, clean, and completed the job on schedule. I will definitely hire them again.",
            review_date: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
            author_avatar: null
        }
    ];

    try {
        // Query user info
        const userResult = await query(
            'SELECT referral_code, custom_domain, primary_color, widget_css, name, google_review_link FROM users WHERE id = $1',
            [parsedClientId]
        );

        if (userResult.rows.length === 0) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            return res.status(200).send('/* LocalLeads Widget: Client profile not found */');
        }

        const user = userResult.rows[0];

        // Determine widget color
        let widgetColor = req.query.color || user.primary_color || '3b82f6';
        if (widgetColor && !widgetColor.startsWith('#')) {
            widgetColor = '#' + widgetColor;
        }

        const customDomain = user.custom_domain ? user.custom_domain.trim() : null;
        const referralCode = user.referral_code ? user.referral_code.trim() : null;
        const widgetCss = user.widget_css ? user.widget_css.trim() : '';
        const businessName = user.name || 'Our Business';
        const reviewLink = user.google_review_link || 'https://maps.google.com';

        let baseUrl = 'https://www.localseogen.com';
        if (customDomain) {
            baseUrl = 'https://' + customDomain;
        }

        const referralUrl = referralCode 
            ? 'https://www.localseogen.com/?ref=' + referralCode 
            : 'https://www.localseogen.com';

        let scriptCode = '';

        if (type === 'reviews') {
            // Retrieve testimonials/reviews
            const reviewsResult = await query(
                'SELECT author_name, rating, review_text, review_date, author_avatar FROM testimonials WHERE user_id = $1 ORDER BY review_date DESC, id DESC LIMIT 15',
                [parsedClientId]
            );

            let reviews = reviewsResult.rows.map(row => ({
                author_name: row.author_name,
                rating: row.rating,
                review_text: row.review_text,
                review_date: row.review_date,
                author_avatar: row.author_avatar
            }));

            if (reviews.length === 0) {
                reviews = fallbackReviews;
            }

            const averageRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);

            const reviewsJson = JSON.stringify(reviews);

            scriptCode = `
(function() {
    if (window.__localseoReviewsLoaded_${parsedClientId}) return;
    window.__localseoReviewsLoaded_${parsedClientId} = true;

    const reviews = ${reviewsJson};
    const theme = "${theme}";
    const layout = "${layout}";
    const baseColor = "${widgetColor}";
    const referralUrl = "${referralUrl}";
    const clientId = ${parsedClientId};
    const widgetCss = ${JSON.stringify(widgetCss)};
    const businessName = ${JSON.stringify(businessName)};
    const reviewLink = "${reviewLink}";
    const averageRating = ${averageRating};

    // CSS Styles injection
    const styleId = 'localseo-reviews-styles-' + clientId;
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        
        let styles = \`
            .ll-reviews-container-\${clientId} {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                box-sizing: border-box;
                margin: 1rem 0;
                width: 100%;
            }
            .ll-reviews-container-\${clientId} * {
                box-sizing: border-box;
            }
            .ll-reviews-header-\${clientId} {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1.25rem;
                padding-bottom: 0.75rem;
                border-bottom: 1px solid rgba(128,128,128,0.15);
                flex-wrap: wrap;
                gap: 12px;
            }
            .ll-reviews-title-\${clientId} {
                font-size: 1.2rem;
                font-weight: 700;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .ll-reviews-summary-\${clientId} {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 0.9rem;
            }
            .ll-reviews-stars-\${clientId} {
                color: #f59e0b;
                letter-spacing: 1px;
            }
            .ll-reviews-grid-\${clientId} {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 16px;
                width: 100%;
            }
            .ll-review-card-\${clientId} {
                border-radius: 12px;
                padding: 1.25rem;
                border: 1px solid rgba(128,128,128,0.15);
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                min-height: 180px;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .ll-review-card-\${clientId}:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0,0,0,0.08);
            }
            .ll-review-meta-\${clientId} {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }
            .ll-review-avatar-\${clientId} {
                width: 38px;
                height: 38px;
                border-radius: 50%;
                background: \${baseColor};
                color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 0.95rem;
                overflow: hidden;
            }
            .ll-review-avatar-\${clientId} img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .ll-review-author-info-\${clientId} {
                display: flex;
                flex-direction: column;
            }
            .ll-review-author-\${clientId} {
                font-weight: 700;
                font-size: 0.9rem;
            }
            .ll-review-date-\${clientId} {
                font-size: 0.75rem;
                opacity: 0.6;
            }
            .ll-review-text-\${clientId} {
                font-size: 0.85rem;
                line-height: 1.5;
                margin-bottom: 10px;
                display: -webkit-box;
                -webkit-line-clamp: 4;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .ll-reviews-footer-\${clientId} {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 1.25rem;
                font-size: 0.8rem;
                opacity: 0.8;
                border-top: 1px solid rgba(128,128,128,0.15);
                padding-top: 8px;
            }
            .ll-reviews-footer-\${clientId} a {
                color: inherit;
                text-decoration: none;
            }
            .ll-reviews-footer-\${clientId} a:hover {
                text-decoration: underline;
            }

            /* Carousel Layout */
            .ll-carousel-wrapper-\${clientId} {
                position: relative;
                width: 100%;
                overflow: hidden;
                border-radius: 12px;
            }
            .ll-carousel-track-\${clientId} {
                display: flex;
                transition: transform 0.3s ease-in-out;
                width: 100%;
            }
            .ll-carousel-slide-\${clientId} {
                min-width: 100%;
                width: 100%;
                padding: 4px;
            }
            .ll-carousel-nav-\${clientId} {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 15px;
                margin-top: 12px;
            }
            .ll-carousel-btn-\${clientId} {
                background: rgba(128,128,128,0.1);
                border: 1px solid rgba(128,128,128,0.15);
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: inherit;
                font-weight: bold;
                transition: background 0.2s, transform 0.1s;
                user-select: none;
            }
            .ll-carousel-btn-\${clientId}:hover {
                background: \${baseColor};
                color: white;
                border-color: \${baseColor};
            }

            /* Floating Badge Layout */
            .ll-badge-trigger-\${clientId} {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: \${baseColor};
                color: #ffffff;
                padding: 12px 20px;
                border-radius: 30px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.15);
                cursor: pointer;
                z-index: 999999;
                font-weight: 700;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .ll-badge-trigger-\${clientId}:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.2);
            }
            .ll-badge-modal-\${clientId} {
                position: fixed;
                bottom: 85px;
                right: 24px;
                width: 350px;
                max-height: 480px;
                background: #ffffff;
                color: #1f2937;
                border-radius: 16px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.25);
                z-index: 999998;
                display: none;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid rgba(0,0,0,0.08);
                animation: llFadeIn-\${clientId} 0.25s ease-out;
            }
            .ll-badge-modal-header-\${clientId} {
                padding: 1rem;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
                font-weight: 700;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .ll-badge-modal-close-\${clientId} {
                cursor: pointer;
                font-size: 1.25rem;
                opacity: 0.6;
            }
            .ll-badge-modal-close-\${clientId}:hover {
                opacity: 1;
            }
            .ll-badge-modal-body-\${clientId} {
                padding: 1rem;
                overflow-y: auto;
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            @keyframes llFadeIn-\${clientId} {
                from { opacity: 0; transform: translateY(15px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* Themes */
            /* Light Theme */
            .ll-theme-light-\${clientId} {
                color: #1f2937;
            }
            .ll-theme-light-\${clientId} .ll-review-card-\${clientId} {
                background: #ffffff;
                color: #374151;
            }
            .ll-theme-light-\${clientId} .ll-review-author-\${clientId} {
                color: #111827;
            }
            .ll-theme-light-\${clientId} .ll-review-text-\${clientId} {
                color: #4b5563;
            }

            /* Dark Theme */
            .ll-theme-dark-\${clientId} {
                color: #f3f4f6;
            }
            .ll-theme-dark-\${clientId} .ll-review-card-\${clientId} {
                background: #1f2937;
                color: #d1d5db;
                border-color: #374151;
            }
            .ll-theme-dark-\${clientId} .ll-review-author-\${clientId} {
                color: #ffffff;
            }
            .ll-theme-dark-\${clientId} .ll-review-text-\${clientId} {
                color: #9ca3af;
            }

            /* Glassmorphic Theme */
            .ll-theme-glassmorphic-\${clientId} {
                color: #ffffff;
            }
            .ll-theme-glassmorphic-\${clientId} .ll-review-card-\${clientId} {
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                color: rgba(255, 255, 255, 0.85);
                border-color: rgba(255, 255, 255, 0.08);
            }
            .ll-theme-glassmorphic-\${clientId} .ll-review-author-\${clientId} {
                color: #ffffff;
            }
            .ll-theme-glassmorphic-\${clientId} .ll-review-text-\${clientId} {
                color: rgba(255, 255, 255, 0.7);
            }

            .ll-badge-modal-dark-\${clientId} {
                background: #1f2937;
                color: #f3f4f6;
                border-color: #374151;
            }
            .ll-badge-modal-dark-\${clientId} .ll-badge-modal-header-\${clientId} {
                background: #111827;
                border-bottom-color: #374151;
            }
            .ll-badge-modal-dark-\${clientId} .ll-review-card-\${clientId} {
                background: #111827;
                color: #d1d5db;
                border-color: #374151;
            }

            .ll-badge-modal-glassmorphic-\${clientId} {
                background: rgba(20, 20, 20, 0.85);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                color: #ffffff;
                border-color: rgba(255, 255, 255, 0.12);
            }
            .ll-badge-modal-glassmorphic-\${clientId} .ll-badge-modal-header-\${clientId} {
                background: rgba(255, 255, 255, 0.02);
                border-bottom-color: rgba(255, 255, 255, 0.08);
            }
            .ll-badge-modal-glassmorphic-\${clientId} .ll-review-card-\${clientId} {
                background: rgba(255, 255, 255, 0.04);
                color: rgba(255, 255, 255, 0.8);
                border-color: rgba(255, 255, 255, 0.08);
            }
        \`;
        style.textContent = styles + '\\n' + widgetCss;
        document.head.appendChild(style);
    }

    // Helper functions
    function makeStars(rating) {
        let s = '';
        for (let i = 1; i <= 5; i++) {
            s += i <= rating ? '★' : '☆';
        }
        return s;
    }

    function formatDate(dateStr) {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch(e) {
            return '';
        }
    }

    function createCard(review) {
        const initial = review.author_name ? review.author_name.charAt(0) : '?';
        const avatarHtml = review.author_avatar 
            ? '<img src="' + review.author_avatar + '" alt="' + review.author_name + '">' 
            : initial;
            
        return \`
            <div class="ll-review-card-\${clientId}">
                <div>
                    <div class="ll-review-meta-\${clientId}">
                        <div class="ll-review-avatar-\${clientId}">\${avatarHtml}</div>
                        <div class="ll-review-author-info-\${clientId}">
                            <span class="ll-review-author-\${clientId}">\${review.author_name}</span>
                            <span class="ll-review-date-\${clientId}">\${formatDate(review.review_date)}</span>
                        </div>
                    </div>
                    <div class="ll-reviews-stars-\${clientId}">\${makeStars(review.rating)}</div>
                    <p class="ll-review-text-\${clientId}" title="\${review.review_text.replace(/"/g, '&quot;')}">\${review.review_text}</p>
                </div>
            </div>
        \`;
    }

    if (layout === 'badge') {
        const trigger = document.createElement('div');
        trigger.className = 'll-badge-trigger-' + clientId;
        trigger.innerHTML = '⭐ ' + averageRating + ' (' + reviews.length + ' Reviews)';
        
        const modal = document.createElement('div');
        modal.className = 'll-badge-modal-' + clientId;
        if (theme === 'dark') modal.classList.add('ll-badge-modal-dark-' + clientId);
        if (theme === 'glassmorphic') modal.classList.add('ll-badge-modal-glassmorphic-' + clientId);

        let cardsHtml = '';
        reviews.forEach(r => {
            cardsHtml += createCard(r);
        });

        modal.innerHTML = \`
            <div class="ll-badge-modal-header-\${clientId}">
                <span>Google Business Reviews</span>
                <span class="ll-badge-modal-close-\${clientId}">&times;</span>
            </div>
            <div class="ll-badge-modal-body-\${clientId}">
                \${cardsHtml}
                <div class="ll-reviews-footer-\${clientId}">
                    <a href="\${reviewLink}" target="_blank">✍️ Write a review</a>
                    <a href="\${referralUrl}" target="_blank" style="font-weight: 700;">LocalLeads</a>
                </div>
            </div>
        \`;

        document.body.appendChild(trigger);
        document.body.appendChild(modal);

        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
        });

        modal.querySelector('.ll-badge-modal-close-' + clientId).addEventListener('click', function(e) {
            e.stopPropagation();
            modal.style.display = 'none';
        });

        document.addEventListener('click', function(e) {
            if (!modal.contains(e.target) && e.target !== trigger) {
                modal.style.display = 'none';
            }
        });
    } else {
        // inline list or grid layout
        let container = document.getElementById('localseo-widget') || document.querySelector('.localseo-widget');
        if (!container) return; 

        container.className = 'll-reviews-container-' + clientId + ' ll-theme-' + theme + '-' + clientId;

        let contentHtml = \`
            <div class="ll-reviews-header-\${clientId}">
                <h3 class="ll-reviews-title-\${clientId}">⭐ Google Reviews</h3>
                <div class="ll-reviews-summary-\${clientId}">
                    <strong>\${averageRating} / 5.0</strong>
                    <span class="ll-reviews-stars-\${clientId}">\${makeStars(Math.round(averageRating))}</span>
                    <span>(\${reviews.length} reviews)</span>
                </div>
            </div>
        \`;

        if (layout === 'grid') {
            contentHtml += '<div class="ll-reviews-grid-' + clientId + '">';
            reviews.forEach(r => {
                contentHtml += createCard(r);
            });
            contentHtml += '</div>';
        } else {
            // carousel / list
            let slidesHtml = '';
            reviews.forEach(r => {
                slidesHtml += \`<div class="ll-carousel-slide-\${clientId}">\${createCard(r)}</div>\`;
            });

            contentHtml += \`
                <div class="ll-carousel-wrapper-\${clientId}">
                    <div class="ll-carousel-track-\${clientId}" id="ll-reviews-track-\${clientId}">
                        \${slidesHtml}
                    </div>
                </div>
                <div class="ll-carousel-nav-\${clientId}">
                    <div class="ll-carousel-btn-\${clientId}" id="ll-reviews-prev-\${clientId}">&lt;</div>
                    <div id="ll-reviews-index-\${clientId}">1 / \${reviews.length}</div>
                    <div class="ll-carousel-btn-\${clientId}" id="ll-reviews-next-\${clientId}">&gt;</div>
                </div>
            \`;
        }

        // Add Powered by brand link
        contentHtml += \`
            <div class="ll-reviews-footer-\${clientId}">
                <a href="\${reviewLink}" target="_blank">✍️ Write a Google Review</a>
                <a href="\${referralUrl}" target="_blank">Powered by <span style="color: \${baseColor}; font-weight: 700;">LocalLeads</span></a>
            </div>
        \`;

        container.innerHTML = contentHtml;

        // Register carousel controls if layout is carousel
        if (layout !== 'grid') {
            setTimeout(() => {
                let currentIndex = 0;
                const track = document.getElementById('ll-reviews-track-' + clientId);
                const prevBtn = document.getElementById('ll-reviews-prev-' + clientId);
                const nextBtn = document.getElementById('ll-reviews-next-' + clientId);
                const indexLabel = document.getElementById('ll-reviews-index-' + clientId);

                if (track && prevBtn && nextBtn && indexLabel) {
                    const updateCarousel = () => {
                        track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
                        indexLabel.textContent = (currentIndex + 1) + ' / ' + reviews.length;
                    };
                    
                    prevBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        if (currentIndex > 0) {
                            currentIndex--;
                            updateCarousel();
                        }
                    });

                    nextBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        if (currentIndex < reviews.length - 1) {
                            currentIndex++;
                            updateCarousel();
                        }
                    });
                }
            }, 100);
        }
    }
})();
            `;
        } else {
            // Service area list widget code
            // Query SEO pages
            const pagesResult = await query(
                'SELECT service, town, file_name FROM seo_pages WHERE user_id = $1 ORDER BY town, service',
                [parsedClientId]
            );

            if (pagesResult.rows.length === 0) {
                res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                return res.status(200).send('/* LocalLeads Widget: No pages generated yet */');
            }

            const pagesJson = JSON.stringify(pagesResult.rows.map(row => ({
                service: row.service,
                town: row.town,
                fileName: row.file_name
            })));

            scriptCode = `
(function() {
    if (window.__localseoWidgetLoaded_${parsedClientId}) return;
    window.__localseoWidgetLoaded_${parsedClientId} = true;

    const pages = ${pagesJson};
    const theme = "${theme}";
    const layout = "${layout}";
    const baseColor = "${widgetColor}";
    const customDomain = ${customDomain ? `"${customDomain}"` : 'null'};
    const referralCode = ${referralCode ? `"${referralCode}"` : 'null'};
    const clientId = ${parsedClientId};
    const widgetCss = ${JSON.stringify(widgetCss)};

    let baseUrl = 'https://www.localseogen.com';
    if (customDomain) {
        baseUrl = 'https://' + customDomain;
    }

    const referralUrl = referralCode 
        ? 'https://www.localseogen.com/?ref=' + referralCode 
        : 'https://www.localseogen.com';

    // CSS Styles injection
    const styleId = 'localseo-widget-styles-' + clientId;
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        
        let styles = \`
            .ll-widget-container-\${clientId} {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                box-sizing: border-box;
                margin: 1rem 0;
                width: 100%;
            }
            .ll-widget-container-\${clientId} * {
                box-sizing: border-box;
            }
            .ll-widget-title-\${clientId} {
                font-size: 1.1rem;
                font-weight: 700;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .ll-widget-grid-\${clientId} {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                gap: 10px;
                width: 100%;
            }
            .ll-widget-card-\${clientId} {
                border-radius: 8px;
                padding: 0.75rem;
                text-decoration: none;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                border: 1px solid rgba(128,128,128,0.2);
                cursor: pointer;
            }
            .ll-widget-card-\${clientId}:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .ll-widget-card-town-\${clientId} {
                font-weight: 700;
                font-size: 0.85rem;
                margin-bottom: 4px;
            }
            .ll-widget-card-service-\${clientId} {
                font-size: 0.75rem;
                opacity: 0.8;
            }
            .ll-widget-list-\${clientId} {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                width: 100%;
            }
            .ll-widget-list-item-\${clientId} a {
                display: inline-block;
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 0.75rem;
                text-decoration: none;
                font-weight: 500;
                transition: background 0.2s ease, transform 0.1s ease;
                border: 1px solid rgba(128,128,128,0.2);
            }
            .ll-widget-list-item-\${clientId} a:hover {
                transform: scale(1.02);
            }
            .ll-widget-footer-\${clientId} {
                margin-top: 1.25rem;
                font-size: 0.8rem;
                opacity: 0.8;
                border-top: 1px solid rgba(128,128,128,0.15);
                padding-top: 8px;
            }
            .ll-widget-footer-\${clientId} a {
                color: inherit;
                text-decoration: none;
            }
            .ll-widget-footer-\${clientId} a:hover {
                text-decoration: underline;
            }

            /* Floating Badge Styles */
            .ll-badge-trigger-\${clientId} {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: \${baseColor};
                color: #ffffff;
                padding: 12px 20px;
                border-radius: 30px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.15);
                cursor: pointer;
                z-index: 999999;
                font-weight: 700;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .ll-badge-trigger-\${clientId}:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.2);
            }
            .ll-badge-modal-\${clientId} {
                position: fixed;
                bottom: 85px;
                right: 24px;
                width: 350px;
                max-height: 450px;
                background: #ffffff;
                color: #1f2937;
                border-radius: 16px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.25);
                z-index: 999998;
                display: none;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid rgba(0,0,0,0.08);
                animation: llFadeIn-\${clientId} 0.25s ease-out;
            }
            .ll-badge-modal-header-\${clientId} {
                padding: 1rem;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
                font-weight: 700;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .ll-badge-modal-close-\${clientId} {
                cursor: pointer;
                font-size: 1.25rem;
                opacity: 0.6;
            }
            .ll-badge-modal-close-\${clientId}:hover {
                opacity: 1;
            }
            .ll-badge-modal-body-\${clientId} {
                padding: 1rem;
                overflow-y: auto;
                flex: 1;
            }
            .ll-badge-modal-body-\${clientId} ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .ll-badge-modal-body-\${clientId} li {
                margin-bottom: 8px;
            }
            .ll-badge-modal-body-\${clientId} a {
                display: block;
                padding: 10px 12px;
                background: #f3f4f6;
                border-radius: 8px;
                text-decoration: none;
                color: #374151;
                font-size: 0.85rem;
                font-weight: 500;
                transition: background 0.15s ease;
                border: 1px solid #e5e7eb;
            }
            .ll-badge-modal-body-\${clientId} a:hover {
                background: \${baseColor};
                color: #ffffff;
                border-color: \${baseColor};
            }

            /* Themes */
            .ll-theme-light-\${clientId} .ll-widget-card-\${clientId} {
                background: #ffffff;
                color: #1f2937;
            }
            .ll-theme-light-\${clientId} .ll-widget-card-\${clientId}:hover {
                border-color: \${baseColor};
            }
            .ll-theme-light-\${clientId} .ll-widget-card-town-\${clientId} {
                color: #111827;
            }
            .ll-theme-light-\${clientId} .ll-widget-list-item-\${clientId} a {
                background: #f3f4f6;
                color: #374151;
            }
            .ll-theme-light-\${clientId} .ll-widget-list-item-\${clientId} a:hover {
                background: \${baseColor};
                color: #ffffff;
                border-color: \${baseColor};
            }
            .ll-theme-light-\${clientId} .ll-widget-title-\${clientId} {
                color: #111827;
            }

            .ll-theme-dark-\${clientId} .ll-widget-card-\${clientId} {
                background: #1f2937;
                color: #f3f4f6;
                border-color: #374151;
            }
            .ll-theme-dark-\${clientId} .ll-widget-card-\${clientId}:hover {
                border-color: \${baseColor};
            }
            .ll-theme-dark-\${clientId} .ll-widget-card-town-\${clientId} {
                color: #ffffff;
            }
            .ll-theme-dark-\${clientId} .ll-widget-list-item-\${clientId} a {
                background: #374151;
                color: #f3f4f6;
                border-color: #4b5563;
            }
            .ll-theme-dark-\${clientId} .ll-widget-list-item-\${clientId} a:hover {
                background: \${baseColor};
                color: #ffffff;
                border-color: \${baseColor};
            }
            .ll-theme-dark-\${clientId} .ll-widget-title-\${clientId} {
                color: #ffffff;
            }

            .ll-theme-glassmorphic-\${clientId} .ll-widget-card-\${clientId} {
                background: rgba(255, 255, 255, 0.05);
                color: #f3f4f6;
                border-color: rgba(255, 255, 255, 0.1);
            }
            .ll-theme-glassmorphic-\${clientId} .ll-widget-card-\${clientId}:hover {
                border-color: \${baseColor};
                background: rgba(255, 255, 255, 0.08);
            }
            .ll-theme-glassmorphic-\${clientId} .ll-widget-list-item-\${clientId} a {
                background: rgba(255, 255, 255, 0.05);
                color: #f3f4f6;
                border-color: rgba(255, 255, 255, 0.1);
            }
            .ll-theme-glassmorphic-\${clientId} .ll-widget-list-item-\${clientId} a:hover {
                background: \${baseColor};
                color: #ffffff;
                border-color: \${baseColor};
            }

            .ll-badge-modal-dark-\${clientId} {
                background: #1f2937;
                color: #f3f4f6;
                border-color: #374151;
            }
            .ll-badge-modal-dark-\${clientId} .ll-badge-modal-header-\${clientId} {
                background: #111827;
                border-bottom-color: #374151;
            }
            .ll-badge-modal-dark-\${clientId} .ll-badge-modal-body-\${clientId} a {
                background: #374151;
                color: #f3f4f6;
                border-color: #4b5563;
            }
            .ll-badge-modal-dark-\${clientId} .ll-badge-modal-body-\${clientId} a:hover {
                background: \${baseColor};
                color: #ffffff;
                border-color: \${baseColor};
            }

            .ll-badge-modal-glassmorphic-\${clientId} {
                background: rgba(20, 20, 20, 0.85);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                color: #ffffff;
                border-color: rgba(255, 255, 255, 0.15);
            }
            .ll-badge-modal-glassmorphic-\${clientId} .ll-badge-modal-header-\${clientId} {
                background: rgba(255, 255, 255, 0.03);
                border-bottom-color: rgba(255, 255, 255, 0.1);
            }
            .ll-badge-modal-glassmorphic-\${clientId} .ll-badge-modal-body-\${clientId} a {
                background: rgba(255, 255, 255, 0.05);
                color: #ffffff;
                border-color: rgba(255, 255, 255, 0.1);
            }
            .ll-badge-modal-glassmorphic-\${clientId} .ll-badge-modal-body-\${clientId} a:hover {
                background: \${baseColor};
                color: #ffffff;
                border-color: \${baseColor};
            }

            @keyframes llFadeIn-\${clientId} {
                from { opacity: 0; transform: translateY(15px); }
                to { opacity: 1; transform: translateY(0); }
            }
        \`;
        style.textContent = styles + '\\n' + widgetCss;
        document.head.appendChild(style);
    }

    // Build html contents
    if (layout === 'badge') {
        const trigger = document.createElement('div');
        trigger.className = 'll-badge-trigger-' + clientId;
        trigger.innerHTML = '📍 Serving ' + pages.length + ' Areas';
        
        const modal = document.createElement('div');
        modal.className = 'll-badge-modal-' + clientId;
        if (theme === 'dark') modal.classList.add('ll-badge-modal-dark-' + clientId);
        if (theme === 'glassmorphic') modal.classList.add('ll-badge-modal-glassmorphic-' + clientId);

        let listItemsHtml = '';
        pages.forEach(p => {
            const url = customDomain ? baseUrl + '/' + p.fileName : baseUrl + '/' + clientId + '/' + p.fileName;
            listItemsHtml += '<li><a href="' + url + '" target="_blank">' + p.service + ' in ' + p.town + '</a></li>';
        });

        modal.innerHTML = \`
            <div class="ll-badge-modal-header-\${clientId}">
                <span>Our Service Areas</span>
                <span class="ll-badge-modal-close-\${clientId}">&times;</span>
            </div>
            <div class="ll-badge-modal-body-\${clientId}">
                <ul>\${listItemsHtml}</ul>
                <div class="ll-widget-footer-\${clientId}" style="margin-top: 1rem; border-top: 1px solid rgba(128,128,128,0.2); padding-top: 8px;">
                    <a href="\${referralUrl}" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 3px;">
                        ⚡ SEO by <span style="color: \${baseColor}; font-weight: 700;">LocalLeads</span>
                    </a>
                </div>
            </div>
        \`;

        document.body.appendChild(trigger);
        document.body.appendChild(modal);

        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
        });

        modal.querySelector('.ll-badge-modal-close-' + clientId).addEventListener('click', function(e) {
            e.stopPropagation();
            modal.style.display = 'none';
        });

        document.addEventListener('click', function(e) {
            if (!modal.contains(e.target) && e.target !== trigger) {
                modal.style.display = 'none';
            }
        });
    } else {
        // inline list or grid layout
        let container = document.getElementById('localseo-widget') || document.querySelector('.localseo-widget');
        if (!container) return;

        container.className = 'll-widget-container-' + clientId + ' ll-theme-' + theme + '-' + clientId;

        let contentHtml = '<div class="ll-widget-title-' + clientId + '">📍 Areas We Serve</div>';

        if (layout === 'grid') {
            contentHtml += '<div class="ll-widget-grid-' + clientId + '">';
            pages.forEach(p => {
                const url = customDomain ? baseUrl + '/' + p.fileName : baseUrl + '/' + clientId + '/' + p.fileName;
                contentHtml += \`
                    <a href="\${url}" target="_blank" class="ll-widget-card-\${clientId}">
                        <div>
                            <div class="ll-widget-card-town-\${clientId}">\${p.town}</div>
                            <div class="ll-widget-card-service-\${clientId}">\${p.service}</div>
                        </div>
                    </a>
                \`;
            });
            contentHtml += '</div>';
        } else {
            // list
            contentHtml += '<ul class="ll-widget-list-' + clientId + '">';
            pages.forEach(p => {
                const url = customDomain ? baseUrl + '/' + p.fileName : baseUrl + '/' + clientId + '/' + p.fileName;
                contentHtml += \`
                    <li class="ll-widget-list-item-\${clientId}">
                        <a href="\${url}" target="_blank">\${p.service} in \${p.town}</a>
                    </li>
                \`;
            });
            contentHtml += '</ul>';
        }

        // Add Powered by brand link
        contentHtml += \`
            <div class="ll-widget-footer-\${clientId}">
                <a href="\${referralUrl}" target="_blank" style="text-decoration: none;">
                    Powered by <span style="color: \${baseColor}; font-weight: 700;">LocalLeads</span>
                </a>
            </div>
        \`;

        container.innerHTML = contentHtml;
    }
})();
            `;
        }

        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.status(200).send(scriptCode);

    } catch (error) {
        await logError(error, 'Widget serving error');
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.status(500).send('/* LocalLeads Widget: Internal server error */');
    }
}
