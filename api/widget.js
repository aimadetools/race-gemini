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
            `SELECT referral_code, custom_domain, primary_color, widget_css, name, google_review_link, email, business_profile, phone,
                    (SELECT slug FROM agency_directory WHERE claimed_user_id = users.id LIMIT 1) as agency_slug
             FROM users WHERE id = $1`,
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
        const agencySlug = user.agency_slug || null;

        let baseUrl = 'https://www.localseogen.com';
        if (customDomain) {
            baseUrl = 'https://' + customDomain;
        }

        let referralUrl = referralCode 
            ? 'https://www.localseogen.com/?ref=' + referralCode 
            : 'https://www.localseogen.com';
            
        if (agencySlug) {
            referralUrl = 'https://www.localseogen.com/agency/' + agencySlug;
        }

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
        } else if (type === 'lead-gen' || type === 'audit') {
            scriptCode = `
(function() {
    if (window.__localseoLeadGenLoaded_${parsedClientId}) return;
    window.__localseoLeadGenLoaded_${parsedClientId} = true;

    const theme = "${theme}";
    const baseColor = "${widgetColor}";
    const referralUrl = "${referralUrl}";
    const clientId = ${parsedClientId};
    const widgetCss = ${JSON.stringify(widgetCss)};
    const agencyName = ${JSON.stringify(businessName)};
    const agencyEmail = ${JSON.stringify(user.email || '')};

    // CSS Styles injection
    const styleId = 'localseo-leadgen-styles-' + clientId;
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        
        let styles = \`
            .ll-leadgen-container-\${clientId} {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                box-sizing: border-box;
                width: 100%;
                margin: 1.5rem auto;
                border-radius: 16px;
                padding: 2rem;
                box-shadow: 0 10px 25px rgba(0,0,0,0.08);
                border: 1px solid rgba(128,128,128,0.15);
                transition: all 0.3s ease;
            }
            .ll-leadgen-container-\${clientId} * {
                box-sizing: border-box;
            }
            .ll-leadgen-header-\${clientId} {
                text-align: center;
                margin-bottom: 1.5rem;
            }
            .ll-leadgen-title-\${clientId} {
                font-size: 1.4rem;
                font-weight: 800;
                margin: 0 0 0.5rem;
                letter-spacing: -0.025em;
            }
            .ll-leadgen-subtitle-\${clientId} {
                font-size: 0.875rem;
                opacity: 0.75;
                margin: 0;
                line-height: 1.5;
            }
            .ll-leadgen-row-\${clientId} {
                display: flex;
                gap: 16px;
                margin-bottom: 1rem;
                flex-wrap: wrap;
            }
            .ll-leadgen-group-\${clientId} {
                flex: 1;
                min-width: 200px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .ll-leadgen-group-\${clientId} label {
                font-size: 0.8rem;
                font-weight: 600;
                opacity: 0.9;
            }
            .ll-leadgen-input-\${clientId} {
                width: 100%;
                padding: 0.75rem 1rem;
                border-radius: 8px;
                border: 1px solid rgba(128,128,128,0.2);
                font-size: 0.9rem;
                background: rgba(255,255,255,0.02);
                color: inherit;
                transition: all 0.2s;
            }
            .ll-leadgen-input-\${clientId}:focus {
                outline: none;
                border-color: \${baseColor};
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
            }
            .ll-leadgen-btn-\${clientId} {
                width: 100%;
                padding: 0.85rem;
                border-radius: 8px;
                border: none;
                background: \${baseColor};
                color: #ffffff;
                font-size: 0.95rem;
                font-weight: 700;
                cursor: pointer;
                margin-top: 1rem;
                transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(128,128,128,0.15);
            }
            .ll-leadgen-btn-\${clientId}:hover {
                filter: brightness(1.1);
                transform: translateY(-1px);
            }
            .ll-leadgen-btn-\${clientId}:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .ll-leadgen-loading-box-\${clientId} {
                text-align: center;
                padding: 2.5rem 1rem;
            }
            .ll-leadgen-spinner-\${clientId} {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(128,128,128,0.15);
                border-radius: 50%;
                border-top-color: \${baseColor};
                animation: ll-spin-\${clientId} 1s linear infinite;
                margin: 0 auto 1.25rem;
            }
            @keyframes ll-spin-\${clientId} {
                to { transform: rotate(360deg); }
            }
            .ll-leadgen-loading-text-\${clientId} {
                font-size: 0.95rem;
                font-weight: 600;
            }

            /* Results formatting */
            .ll-leadgen-results-\${clientId} {
                animation: ll-fade-in-\${clientId} 0.3s ease-out;
            }
            @keyframes ll-fade-in-\${clientId} {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .ll-results-score-\${clientId} {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 1.5rem;
                margin-bottom: 1.5rem;
                padding-bottom: 1.25rem;
                border-bottom: 1px solid rgba(128,128,128,0.15);
                flex-wrap: wrap;
            }
            .ll-score-gauge-\${clientId} {
                width: 72px;
                height: 72px;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .ll-score-gauge-\${clientId} svg {
                transform: rotate(-90deg);
            }
            .ll-gauge-percent-\${clientId} {
                position: absolute;
                font-size: 0.95rem;
                font-weight: 800;
            }
            .ll-results-summary-stats-\${clientId} {
                flex: 1;
                min-width: 150px;
            }
            .ll-summary-stat-val-\${clientId} {
                font-size: 1.4rem;
                font-weight: 800;
                margin-bottom: 2px;
            }
            .ll-summary-stat-desc-\${clientId} {
                font-size: 0.8rem;
                opacity: 0.7;
            }
            
            /* Visual rank grid mapping */
            .ll-results-grid-\${clientId} {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin: 1.5rem auto;
                max-width: 320px;
                width: 100%;
            }
            .ll-results-cell-\${clientId} {
                aspect-ratio: 1.1;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                padding: 6px;
                border: 1px solid rgba(128,128,128,0.15);
                text-align: center;
                position: relative;
                font-size: 0.75rem;
            }
            .ll-cell-label-\${clientId} {
                font-size: 0.65rem;
                opacity: 0.6;
                text-transform: uppercase;
                margin-top: 2px;
            }
            .ll-cell-value-\${clientId} {
                font-weight: 800;
                font-size: 0.85rem;
            }
            .ll-cell-dot-\${clientId} {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                margin-bottom: 4px;
            }

            .ll-opportunity-list-\${clientId} {
                margin: 1.5rem 0;
            }
            .ll-opportunity-title-\${clientId} {
                font-size: 0.95rem;
                font-weight: 700;
                margin-bottom: 0.75rem;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .ll-opportunity-items-\${clientId} {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 200px;
                overflow-y: auto;
                padding-right: 4px;
            }
            .ll-opportunity-item-\${clientId} {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(128,128,128,0.05);
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.8rem;
            }
            .ll-opp-name-\${clientId} {
                font-weight: 600;
            }
            .ll-opp-volume-\${clientId} {
                opacity: 0.7;
            }

            .ll-results-cta-\${clientId} {
                background: rgba(128,128,128,0.05);
                border: 1px dashed rgba(128,128,128,0.25);
                padding: 1.25rem;
                border-radius: 10px;
                text-align: center;
                margin-top: 1.5rem;
            }
            .ll-results-cta-text-\${clientId} {
                font-size: 0.85rem;
                margin: 0 0 1rem;
                line-height: 1.5;
            }
            .ll-results-cta-btn-\${clientId} {
                display: inline-block;
                padding: 8px 16px;
                background: \${baseColor};
                color: #ffffff;
                text-decoration: none;
                font-size: 0.85rem;
                font-weight: bold;
                border-radius: 6px;
                transition: all 0.2s;
            }
            .ll-results-cta-btn-\${clientId}:hover {
                filter: brightness(1.1);
            }

            /* Theme specific variations */
            .ll-theme-light-\${clientId} {
                background: #ffffff;
                color: #1f2937;
            }
            .ll-theme-light-\${clientId} .ll-leadgen-input-\${clientId} {
                background: #f9fafb;
                border-color: #e5e7eb;
                color: #1f2937;
            }
            .ll-theme-light-\${clientId} .ll-results-cell-\${clientId} {
                background: #f9fafb;
                color: #1f2937;
            }
            
            .ll-theme-dark-\${clientId} {
                background: #111827;
                color: #f3f4f6;
                border-color: #374151;
            }
            .ll-theme-dark-\${clientId} .ll-leadgen-input-\${clientId} {
                background: #1f2937;
                border-color: #4b5563;
                color: #f3f4f6;
            }
            .ll-theme-dark-\${clientId} .ll-results-cell-\${clientId} {
                background: #1f2937;
                border-color: #374151;
                color: #f3f4f6;
            }

            .ll-theme-glassmorphic-\${clientId} {
                background: rgba(15, 23, 42, 0.7);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                color: #ffffff;
                border-color: rgba(255, 255, 255, 0.12);
            }
            .ll-theme-glassmorphic-\${clientId} .ll-leadgen-input-\${clientId} {
                background: rgba(255, 255, 255, 0.03);
                border-color: rgba(255, 255, 255, 0.12);
                color: #ffffff;
            }
            .ll-theme-glassmorphic-\${clientId} .ll-results-cell-\${clientId} {
                background: rgba(255, 255, 255, 0.03);
                border-color: rgba(255, 255, 255, 0.08);
                color: #ffffff;
            }
        \`;
        style.textContent = styles + '\\n' + widgetCss;
        document.head.appendChild(style);
    }

    // Embed HTML form
    let container = document.getElementById('localseo-widget') || document.querySelector('.localseo-widget');
    if (!container) return;

    container.className = 'll-leadgen-container-' + clientId + ' ll-theme-' + theme + '-' + clientId;

    container.innerHTML = \`
        <div id="ll-leadgen-input-step-\${clientId}">
            <div class="ll-leadgen-header-\${clientId}">
                <h3 class="ll-leadgen-title-\${clientId}" style="color: \${theme === 'light' ? '#111827' : '#ffffff'}; font-size: 1.4rem; font-weight: 800; margin: 0 0 0.5rem; letter-spacing: -0.025em;">Free Local Search Audit</h3>
                <p class="ll-leadgen-subtitle-\${clientId}">Scan your local presence. Find where you rank in nearby service areas instantly.</p>
            </div>
            <form id="ll-leadgen-form-\${clientId}">
                <div class="ll-leadgen-row-\${clientId}">
                    <div class="ll-leadgen-group-\${clientId}">
                        <label>Business Name</label>
                        <input type="text" class="ll-leadgen-input-\${clientId}" id="ll-biz-name-\${clientId}" placeholder="e.g. Acme Plumbing" required />
                    </div>
                    <div class="ll-leadgen-group-\${clientId}">
                        <label>Website URL</label>
                        <input type="url" class="ll-leadgen-input-\${clientId}" id="ll-biz-url-\${clientId}" placeholder="e.g. acmeplumbing.com" required />
                    </div>
                </div>
                <div class="ll-leadgen-row-\${clientId}">
                    <div class="ll-leadgen-group-\${clientId}">
                        <label>Base City</label>
                        <input type="text" class="ll-leadgen-input-\${clientId}" id="ll-biz-city-\${clientId}" placeholder="e.g. Austin" required />
                    </div>
                    <div class="ll-leadgen-group-\${clientId}">
                        <label>Service Category</label>
                        <input type="text" class="ll-leadgen-input-\${clientId}" id="ll-biz-service-\${clientId}" placeholder="e.g. Plumber" required />
                    </div>
                </div>
                <div class="ll-leadgen-row-\${clientId}">
                    <div class="ll-leadgen-group-\${clientId}">
                        <label>Contact Name</label>
                        <input type="text" class="ll-leadgen-input-\${clientId}" id="ll-owner-name-\${clientId}" placeholder="Your Name" required />
                    </div>
                    <div class="ll-leadgen-group-\${clientId}">
                        <label>Business Email</label>
                        <input type="email" class="ll-leadgen-input-\${clientId}" id="ll-owner-email-\${clientId}" placeholder="you@company.com" required />
                    </div>
                </div>
                <div class="ll-leadgen-group-\${clientId}" style="margin-bottom: 1rem;">
                    <label>Phone Number (Optional)</label>
                    <input type="tel" class="ll-leadgen-input-\${clientId}" id="ll-owner-phone-\${clientId}" placeholder="e.g. 555-123-4567" />
                </div>
                <button type="submit" class="ll-leadgen-btn-\${clientId}">Scan My Local SEO</button>
            </form>
        </div>

        <div id="ll-leadgen-loading-step-\${clientId}" style="display: none;">
            <div class="ll-leadgen-loading-box-\${clientId}">
                <div class="ll-leadgen-spinner-\${clientId}"></div>
                <div class="ll-leadgen-loading-text-\${clientId}" id="ll-loading-text-\${clientId}">Analyzing search visibility...</div>
            </div>
        </div>

        <div id="ll-leadgen-results-step-\${clientId}" style="display: none;" class="ll-leadgen-results-\${clientId}">
            <!-- Scanned Grid Results dynamically filled -->
        </div>
    \`;

    const form = document.getElementById('ll-leadgen-form-' + clientId);
    const inputStep = document.getElementById('ll-leadgen-input-step-' + clientId);
    const loadingStep = document.getElementById('ll-leadgen-loading-step-' + clientId);
    const resultsStep = document.getElementById('ll-leadgen-results-step-' + clientId);
    const loadingText = document.getElementById('ll-loading-text-' + clientId);

    const loadingStages = [
        "Geocoding target coordinates...",
        "Identifying neighboring towns...",
        "Crawling website content...",
        "Analyzing local rank matrix..."
    ];

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const businessNameInput = document.getElementById('ll-biz-name-' + clientId).value.trim();
        const userUrlInput = document.getElementById('ll-biz-url-' + clientId).value.trim();
        const cityInput = document.getElementById('ll-biz-city-' + clientId).value.trim();
        const serviceInput = document.getElementById('ll-biz-service-' + clientId).value.trim();
        const nameInput = document.getElementById('ll-owner-name-' + clientId).value.trim();
        const emailInput = document.getElementById('ll-owner-email-' + clientId).value.trim();
        const phoneInput = document.getElementById('ll-owner-phone-' + clientId).value.trim();

        // Switch to loading
        inputStep.style.display = 'none';
        loadingStep.style.display = 'block';

        let stageIndex = 0;
        const intervalId = setInterval(() => {
            stageIndex = (stageIndex + 1) % loadingStages.length;
            loadingText.textContent = loadingStages[stageIndex];
        }, 1000);

        let scanResults = null;

        try {
            // 1. Submit lead details to CRM
            await fetch('/api/capture-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailInput,
                    url: userUrlInput,
                    userId: clientId,
                    name: nameInput,
                    phone: phoneInput || null,
                    source: 'embed-lead-gen',
                    message: 'Requested local rank scan for city: ' + cityInput + ', service: ' + serviceInput
                })
            });
        } catch (err) {
            console.error('Lead capture error:', err);
        }

        try {
            // 2. Query ranking matrix
            const scanResp = await fetch('/api/public-local-seo-grid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessName: businessNameInput,
                    userUrl: userUrlInput,
                    city: cityInput,
                    service: serviceInput
                })
            });
            if (scanResp.ok) {
                scanResults = await scanResp.json();
            }
        } catch (err) {
            console.error('Local SEO Grid Scan error:', err);
        }

        clearInterval(intervalId);
        loadingStep.style.display = 'none';

        if (scanResults) {
            renderResults(scanResults);
            resultsStep.style.display = 'block';
        } else {
            // Fallback restore form
            inputStep.style.display = 'block';
            alert('We were unable to geocode that city. Please verify spelling and try again.');
        }
    });

    function renderResults(data) {
        const grid = data.grid;
        const summary = data.summary;
        
        // Gauge stroke calculation
        const coverage = summary.coveragePercentage;
        const strokeVal = 188.4 - (188.4 * coverage) / 100;
        const gaugeColor = coverage > 40 ? '#10b981' : '#ef4444';

        // 3x3 Grid rendering cells
        let cellsHtml = '';
        const cellOrders = ['NW', 'N', 'NE', 'W', 'CTR', 'E', 'SW', 'S', 'SE'];
        cellOrders.forEach(direction => {
            const cell = grid.find(c => c.direction === direction) || { name: 'N/A', status: 'opportunity', rank: 'N/A', direction };
            const isCenter = direction === 'CTR';
            const isVisible = cell.status === 'visible' || isCenter;
            const statusColor = isVisible ? '#10b981' : '#ef4444';
            const rankText = isCenter ? 'CTR' : (isVisible ? '#' + cell.rank : 'Missed');

            cellsHtml += \`
                <div class="ll-results-cell-\${clientId}">
                    <div class="ll-cell-dot-\${clientId}" style="background: \${statusColor};"></div>
                    <div class="ll-cell-value-\${clientId}">\${rankText}</div>
                    <div class="ll-cell-label-\${clientId}">\${direction}</div>
                </div>
            \`;
        });

        // List of top opportunities (missed towns)
        let opportunitiesHtml = '';
        const opps = grid.filter(c => c.status !== 'visible' && c.direction !== 'CTR');
        if (opps.length > 0) {
            opps.slice(0, 5).forEach(o => {
                opportunitiesHtml += \`
                    <div class="ll-opportunity-item-\${clientId}">
                        <span class="ll-opp-name-\${clientId}">📍 \${o.name}</span>
                        <span class="ll-opp-volume-\${clientId}">\${o.searchVolume} searches/mo</span>
                    </div>
                \`;
            });
        } else {
            opportunitiesHtml = '<p style="font-size: 0.8rem; opacity: 0.7;">No major missed opportunities detected!</p>';
        }

        resultsStep.innerHTML = \`
            <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem; text-align: center; color: \${theme === 'light' ? '#111827' : '#ffffff'};">Scan Results</h3>
            
            <div class="ll-results-score-\${clientId}">
                <div class="ll-score-gauge-\${clientId}">
                    <svg width="72" height="72">
                        <circle cx="36" cy="36" r="30" fill="transparent" stroke="rgba(128,128,128,0.15)" stroke-width="5" />
                        <circle cx="36" cy="36" r="30" fill="transparent" stroke="\${gaugeColor}" stroke-width="5" stroke-dasharray="188.4" stroke-dashoffset="\${strokeVal}" />
                    </svg>
                    <span class="ll-gauge-percent-\${clientId}">\${coverage}%</span>
                </div>
                <div class="ll-results-summary-stats-\${clientId}">
                    <div class="ll-summary-stat-val-\${clientId}" style="color: \${theme === 'light' ? '#111827' : '#ffffff'};">\${summary.visibleCount} / \${grid.length}</div>
                    <div class="ll-summary-stat-desc-\${clientId}">Target Towns Captured</div>
                </div>
            </div>

            <p style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1rem; text-align: center;">
                Your local search visibility score is <strong>\${coverage}%</strong>. You rank well in the center but are missing customers in surrounding areas.
            </p>

            <div class="ll-results-grid-\${clientId}">
                \${cellsHtml}
            </div>

            <div class="ll-opportunity-list-\${clientId}">
                <div class="ll-opportunity-title-\${clientId}">Untapped Search Volume</div>
                <div class="ll-opportunity-items-\${clientId}">
                    \${opportunitiesHtml}
                </div>
            </div>

            <div class="ll-results-cta-\${clientId}" style="background: rgba(128,128,128,0.05); border: 1px dashed rgba(128,128,128,0.25); padding: 1.25rem; border-radius: 10px; text-align: center; margin-top: 1.5rem;">
                <p class="ll-results-cta-text-\${clientId}" style="font-size: 0.85rem; margin: 0 0 1rem; line-height: 1.5;">
                    Generate search-optimized landing pages for all missed towns to capture <strong>\${summary.totalSearchVolume.toLocaleString()} searches/mo</strong>.
                </p>
                <a href="\${referralUrl}" target="_blank" class="ll-results-cta-btn-\${clientId}" style="display: inline-block; padding: 8px 16px; background: \${baseColor}; color: #ffffff; text-decoration: none; font-size: 0.85rem; font-weight: bold; border-radius: 6px; transition: all 0.2s;">Dominating Your Local Market</a>
            </div>
        \`;
    }
})();
            `;
        } else if (type === 'business-card') {
            const profile = user.business_profile ? (typeof user.business_profile === 'string' ? JSON.parse(user.business_profile) : user.business_profile) : {};
            const profileJson = JSON.stringify(profile);

            scriptCode = `
(function() {
    if (window.__localseoCardLoaded_${parsedClientId}) return;
    window.__localseoCardLoaded_${parsedClientId} = true;

    const profile = ${profileJson};
    const theme = "${theme}";
    const baseColor = "${widgetColor}";
    const referralUrl = "${referralUrl}";
    const clientId = ${parsedClientId};
    const widgetCss = ${JSON.stringify(widgetCss)};
    const businessName = ${JSON.stringify(businessName)};
    const reviewLink = "${reviewLink}";

    // CSS Styles injection
    const styleId = 'localseo-card-styles-' + clientId;
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        
        let styles = \`
            .ll-card-wrapper-\${clientId} {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                box-sizing: border-box;
                width: 100%;
                max-width: 480px;
                margin: 1.5rem auto;
                border-radius: 16px;
                padding: 1.75rem;
                box-shadow: 0 10px 25px rgba(0,0,0,0.08);
                border: 1px solid rgba(128,128,128,0.15);
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                gap: 1.25rem;
                text-align: left;
            }
            .ll-card-wrapper-\${clientId} * {
                box-sizing: border-box;
            }
            .ll-card-header-\${clientId} {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 1px solid rgba(128,128,128,0.15);
                padding-bottom: 0.75rem;
                flex-wrap: wrap;
                gap: 8px;
            }
            .ll-card-title-\${clientId} {
                font-size: 1.3rem;
                font-weight: 800;
                margin: 0;
                color: inherit;
            }
            .ll-card-badge-\${clientId} {
                font-size: 0.7rem;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 12px;
                background: \${baseColor}20;
                color: \${baseColor};
                border: 1px solid \${baseColor}40;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .ll-card-desc-\${clientId} {
                font-size: 0.9rem;
                line-height: 1.5;
                margin: 0 0 1rem 0;
                opacity: 0.85;
            }
            .ll-card-details-\${clientId} {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .ll-card-detail-item-\${clientId} {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 0.88rem;
                line-height: 1.4;
            }
            .ll-card-detail-item-\${clientId} i {
                color: \${baseColor};
                width: 16px;
                text-align: center;
                font-size: 0.95rem;
            }
            .ll-card-detail-item-\${clientId} a {
                color: inherit;
                text-decoration: none;
                transition: color 0.2s;
            }
            .ll-card-detail-item-\${clientId} a:hover {
                color: \${baseColor};
                text-decoration: underline;
            }
            .ll-card-actions-\${clientId} {
                display: flex;
                gap: 12px;
                margin-top: 0.5rem;
                flex-wrap: wrap;
            }
            .ll-card-btn-\${clientId} {
                flex: 1;
                min-width: 120px;
                padding: 0.75rem 1rem;
                border-radius: 8px;
                font-size: 0.85rem;
                font-weight: 700;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all 0.2s;
            }
            .ll-card-btn-map-\${clientId} {
                background: rgba(128,128,128,0.08);
                color: inherit;
                border: 1px solid rgba(128,128,128,0.15);
            }
            .ll-card-btn-map-\${clientId}:hover {
                background: rgba(128,128,128,0.15);
            }
            .ll-card-btn-review-\${clientId} {
                background: \${baseColor};
                color: #ffffff;
                border: 1px solid \${baseColor};
            }
            .ll-card-btn-review-\${clientId}:hover {
                filter: brightness(1.1);
            }
            .ll-card-footer-\${clientId} {
                border-top: 1px solid rgba(128,128,128,0.15);
                padding-top: 0.75rem;
                font-size: 0.75rem;
                opacity: 0.75;
                text-align: center;
            }
            .ll-card-footer-\${clientId} a {
                color: inherit;
                text-decoration: none;
            }
            .ll-card-footer-\${clientId} a:hover {
                text-decoration: underline;
            }

            /* Themes */
            .ll-theme-light-\${clientId} {
                background: #ffffff;
                color: #1f2937;
                box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            }
            .ll-theme-dark-\${clientId} {
                background: #111827;
                color: #f3f4f6;
                border-color: #374151;
            }
            .ll-theme-glassmorphic-\${clientId} {
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                color: #ffffff;
                border-color: rgba(255, 255, 255, 0.08);
            }
        \`;
        style.textContent = styles + '\\n' + widgetCss;
        document.head.appendChild(style);
    }

    // FontAwesome Dynamic Loader
    if (!document.querySelector('link[href*="font-awesome"]') && !document.querySelector('link[href*="all.min.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
        document.head.appendChild(link);
    }

    // Dynamic Schema injection
    const schema = {
        "@context": "https://schema.org",
        "@type": profile.type || "LocalBusiness",
        "name": profile.name || businessName,
        "description": profile.description || "",
        "telephone": profile.phone || "",
        "email": profile.email || "",
        "url": profile.website || window.location.origin
    };

    if (profile.address) {
        schema.address = {
            "@type": "PostalAddress",
            "streetAddress": profile.address.streetAddress || "",
            "addressLocality": profile.address.addressLocality || "",
            "addressRegion": profile.address.addressRegion || "",
            "postalCode": profile.address.postalCode || "",
            "addressCountry": profile.address.addressCountry || "US"
        };
    }

    if (profile.coordinates && profile.coordinates.latitude && profile.coordinates.longitude) {
        schema.geo = {
            "@type": "GeoCoordinates",
            "latitude": profile.coordinates.latitude,
            "longitude": profile.coordinates.longitude
        };
    }

    if (profile.hours && profile.hours.length > 0) {
        schema.openingHours = profile.hours;
    }

    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.textContent = JSON.stringify(schema);
    document.head.appendChild(schemaScript);

    // Render HTML card inside target container
    let container = document.getElementById('localseo-widget') || document.querySelector('.localseo-widget');
    if (!container) return;

    container.className = 'll-card-wrapper-' + clientId + ' ll-theme-' + theme + '-' + clientId;

    const bizName = profile.name || businessName;
    const bizType = profile.type || 'Local Business';
    const bizDesc = profile.description || '';
    const street = profile.address ? (profile.address.streetAddress || '') : '';
    const locality = profile.address ? (profile.address.addressLocality || '') : '';
    const region = profile.address ? (profile.address.addressRegion || '') : '';
    const zip = profile.address ? (profile.address.postalCode || '') : '';
    const phone = profile.phone || '';
    const email = profile.email || '';
    
    let hoursHtml = '';
    if (profile.hours && profile.hours.length > 0) {
        const hoursList = Array.isArray(profile.hours) ? profile.hours : [profile.hours];
        hoursHtml = \`
            <div class="ll-card-detail-item-\${clientId}">
                <i class="fas fa-clock"></i>
                <span>\${hoursList.join(', ')}</span>
            </div>
        \`;
    }

    let addressHtml = '';
    if (street || locality) {
        addressHtml = \`
            <div class="ll-card-detail-item-\${clientId}">
                <i class="fas fa-map-marker-alt"></i>
                <span>\${street}\${street && locality ? ', ' : ''}\${locality}\${locality && region ? ', ' : ''}\${region} \${zip}</span>
            </div>
        \`;
    }

    let phoneHtml = '';
    if (phone) {
        phoneHtml = \`
            <div class="ll-card-detail-item-\${clientId}">
                <i class="fas fa-phone"></i>
                <a href="tel:\${phone}">\${phone}</a>
            </div>
        \`;
    }

    let emailHtml = '';
    if (email) {
        emailHtml = \`
            <div class="ll-card-detail-item-\${clientId}">
                <i class="fas fa-envelope"></i>
                <a href="mailto:\${email}">\${email}</a>
            </div>
        \`;
    }

    let actionsHtml = '';
    if (locality) {
        actionsHtml += \`
            <a href="https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(bizName + ' ' + street + ' ' + locality)}" target="_blank" class="ll-card-btn-\${clientId} ll-card-btn-map-\${clientId}">
                <i class="fas fa-directions"></i> Get Directions
            </a>
        \`;
    }
    actionsHtml += \`
        <a href="\${reviewLink}" target="_blank" class="ll-card-btn-\${clientId} ll-card-btn-review-\${clientId}">
            <i class="fas fa-star"></i> Write a Review
        </a>
    \`;

    container.innerHTML = \`
        <div class="ll-card-header-\${clientId}">
            <h3 class="ll-card-title-\${clientId}">\${bizName}</h3>
            <span class="ll-card-badge-\${clientId}">\${bizType}</span>
        </div>
        <div class="ll-card-body-\${clientId}">
            \${bizDesc ? \`<p class="ll-card-desc-\${clientId}">\${bizDesc}</p>\` : ''}
            <div class="ll-card-details-\${clientId}">
                \${addressHtml}
                \${phoneHtml}
                \${emailHtml}
                \${hoursHtml}
            </div>
        </div>
        <div class="ll-card-actions-\${clientId}">
            \${actionsHtml}
        </div>
        <div class="ll-card-footer-\${clientId}">
            <a href="\${referralUrl}" target="_blank" style="text-decoration: none;">
                Powered by <span style="color: \${baseColor}; font-weight: 700;">LocalLeads</span>
            </a>
        </div>
    \`;
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
