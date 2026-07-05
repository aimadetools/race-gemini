document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const typeSelect = document.getElementById('widget-type-select');
    const layoutSelect = document.getElementById('widget-layout-select');
    const themeSelect = document.getElementById('widget-theme-select');
    const colorInput = document.getElementById('widget-color-input');
    const colorText = document.getElementById('widget-color-text');
    const clientIdInput = document.getElementById('widget-client-id');
    const cssInput = document.getElementById('widget-css-input');
    const embedCodeTextarea = document.getElementById('widget-embed-code');
    const copyBtn = document.getElementById('copy-widget-code-btn');
    const previewBox = document.getElementById('widget-preview-box');

    const layoutGroupContainer = document.getElementById('layout-group-container');
    const cssGroupContainer = document.getElementById('css-group-container');

    if (!typeSelect || !layoutSelect || !themeSelect || !colorInput || !colorText || !clientIdInput || !cssInput || !embedCodeTextarea || !previewBox) {
        return;
    }

    // Mock Data for Previews
    const mockReviews = [
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

    const mockPages = [
        { service: "Emergency Plumbing", town: "Austin", fileName: "emergency-plumbing-in-austin.html" },
        { service: "Drain Cleaning", town: "West Lake Hills", fileName: "drain-cleaning-in-west-lake-hills.html" },
        { service: "Water Heater Repair", town: "Round Rock", fileName: "water-heater-repair-in-round-rock.html" },
        { service: "Leak Detection", town: "Pflugerville", fileName: "leak-detection-in-pflugerville.html" }
    ];

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

    function createReviewCard(review, clientId) {
        const initial = review.author_name ? review.author_name.charAt(0) : '?';
        return `
            <div class="ll-review-card-${clientId}" style="border: 1px solid rgba(128,128,128,0.15); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; min-height: 160px; margin-bottom: 10px; text-align: left;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: ${colorInput.value}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">${initial}</div>
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 700; font-size: 0.85rem;">${review.author_name}</span>
                            <span style="font-size: 0.7rem; opacity: 0.6;">${formatDate(review.review_date)}</span>
                        </div>
                    </div>
                    <div style="color: #f59e0b; letter-spacing: 1px; font-size: 0.95rem; margin-bottom: 8px;">${makeStars(review.rating)}</div>
                    <p style="font-size: 0.8rem; line-height: 1.4; margin: 0; opacity: 0.95;">${review.review_text}</p>
                </div>
            </div>
        `;
    }

    // Event Listeners
    colorInput.addEventListener('input', (e) => {
        colorText.value = e.target.value.toUpperCase();
        updateEmbedAndPreview();
    });

    colorText.addEventListener('input', (e) => {
        let val = e.target.value.trim();
        if (val && !val.startsWith('#')) {
            val = '#' + val;
        }
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            colorInput.value = val;
            updateEmbedAndPreview();
        }
    });

    typeSelect.addEventListener('change', () => {
        const widgetType = typeSelect.value;
        
        // Adjust layout dropdown values based on widget type
        if (widgetType === 'service-area') {
            layoutGroupContainer.style.display = 'block';
            layoutSelect.innerHTML = `
                <option value="badge">Floating Badge</option>
                <option value="grid">Modern Card Grid</option>
                <option value="list">Pill/List Layout</option>
            `;
        } else if (widgetType === 'reviews') {
            layoutGroupContainer.style.display = 'block';
            layoutSelect.innerHTML = `
                <option value="badge">Floating Badge (Recommended)</option>
                <option value="grid">Modern Card Grid</option>
                <option value="carousel">Review Carousel</option>
            `;
        } else {
            layoutGroupContainer.style.display = 'none';
        }
        
        updateEmbedAndPreview();
    });

    layoutSelect.addEventListener('change', updateEmbedAndPreview);
    themeSelect.addEventListener('change', updateEmbedAndPreview);
    clientIdInput.addEventListener('input', updateEmbedAndPreview);
    cssInput.addEventListener('input', updateCssPreview);

    function updateCssPreview() {
        let style = document.getElementById('widget-preview-custom-css');
        if (!style) {
            style = document.createElement('style');
            style.id = 'widget-preview-custom-css';
            document.head.appendChild(style);
        }
        style.textContent = cssInput.value;
    }

    function updateBaseCssPreview(theme, layout, baseColor, clientId) {
        let style = document.getElementById('widget-preview-base-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'widget-preview-base-styles';
            document.head.appendChild(style);
        }

        style.textContent = `
            .ll-theme-light-${clientId} { background: #ffffff; color: #1f2937; }
            .ll-theme-dark-${clientId} { background: #1f2937; color: #f3f4f6; }
            .ll-theme-glassmorphic-${clientId} { background: rgba(31, 41, 55, 0.4); backdrop-filter: blur(10px); color: #f3f4f6; }
        `;
    }

    function updateEmbedAndPreview() {
        const widgetType = typeSelect.value;
        const layout = layoutSelect.value;
        const theme = themeSelect.value;
        const color = colorInput.value.replace('#', '');
        const clientId = clientIdInput.value.trim() || '104';
        const origin = window.location.origin;

        // Update WordPress guide context
        const guideTitleEl = document.getElementById('widget-guide-title');
        const guideIconEl = document.getElementById('widget-guide-icon');
        if (guideTitleEl) {
            let widgetName = 'Widget';
            if (widgetType === 'reviews') widgetName = 'Reviews Widget';
            else if (widgetType === 'service-area') widgetName = 'Service Area Widget';
            else if (widgetType === 'business-card') widgetName = 'Contact Card & Schema Widget';
            else if (widgetType === 'seo-audit') widgetName = 'SEO Audit Widget';
            guideTitleEl.textContent = `${widgetName} WordPress & CMS Guide`;
        }
        if (guideIconEl) {
            if (widgetType === 'reviews') {
                guideIconEl.className = 'fas fa-star';
                guideIconEl.style.color = '#f59e0b';
            } else if (widgetType === 'business-card') {
                guideIconEl.className = 'fas fa-address-card';
                guideIconEl.style.color = '#10b981';
            } else if (widgetType === 'seo-audit') {
                guideIconEl.className = 'fas fa-search-plus';
                guideIconEl.style.color = '#6366f1';
            } else {
                guideIconEl.className = 'fab fa-wordpress';
                guideIconEl.style.color = '#3b82f6';
            }
        }

        const gutenbergEl = document.querySelector('#widget-guide-wp-gutenberg ol');
        if (gutenbergEl) {
            if (widgetType === 'reviews') {
                gutenbergEl.innerHTML = `
                    <li>Open the page or post where you want the reviews widget to appear in the WordPress editor.</li>
                    <li>Click the <strong>+ (Add Block)</strong> button and search for the <strong>Custom HTML</strong> block.</li>
                    <li>Paste the copied reviews widget script embed code into the block.</li>
                    <li>Click <strong>Update</strong> or <strong>Publish</strong> to see it render live on your website.</li>
                `;
            } else if (widgetType === 'seo-audit') {
                gutenbergEl.innerHTML = `
                    <li>Create a new page on your WordPress site (e.g., <code>/free-seo-audit/</code>).</li>
                    <li>Click the <strong>+ (Add Block)</strong> button and search for <strong>Custom HTML</strong>.</li>
                    <li>Paste the white-label SEO audit widget iframe embed snippet.</li>
                    <li>Update or publish the page. Visitors can now run audits directly on your site!</li>
                `;
            } else if (widgetType === 'business-card') {
                gutenbergEl.innerHTML = `
                    <li>Edit the contact or home page of your WordPress site.</li>
                    <li>Click the <strong>+ (Add Block)</strong> button and select <strong>Custom HTML</strong>.</li>
                    <li>Paste the copied Contact Card &amp; Schema widget code.</li>
                    <li>This will inject the visual contact card block AND the local SEO JSON-LD schema into your page head automatically!</li>
                `;
            } else {
                gutenbergEl.innerHTML = `
                    <li>Open the page or post where you want the service area widget to appear in the WordPress editor.</li>
                    <li>Click the <strong>+ (Add Block)</strong> button and choose the <strong>Custom HTML</strong> block.</li>
                    <li>Paste the copied service area script embed code into the text area of the block.</li>
                    <li>Click <strong>Update</strong> or <strong>Publish</strong> to save the changes.</li>
                `;
            }
        }

        // Generate Embed Code
        let embedCode = '';
        if (widgetType === 'seo-audit') {
            const iframeUrl = `${origin}/audit-widget.html?agencyId=${clientId}&theme=${theme}&color=${color}`;
            embedCode = `<!-- LocalLeads White-Label SEO Audit Widget Embed -->\n<iframe src="${iframeUrl}" style="width: 100%; min-height: 600px; border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" title="Local SEO Audit"></iframe>`;
        } else if (widgetType === 'business-card') {
            const scriptUrl = `${origin}/api/widget?clientId=${clientId}&theme=${theme}&color=${color}&type=business-card`;
            embedCode = `<!-- LocalLeads Local Business Schema & Card Embed -->\n<div id="localseo-widget"></div>\n<script src="${scriptUrl}"></script>`;
        } else {
            const scriptUrl = `${origin}/api/widget?clientId=${clientId}&theme=${theme}&layout=${layout}&color=${color}&type=${widgetType}`;
            if (layout === 'badge') {
                embedCode = `<!-- LocalLeads ${widgetType === 'reviews' ? 'Google Review' : 'Service Area'} Widget Embed -->\n<script src="${scriptUrl}"></script>`;
            } else {
                embedCode = `<!-- LocalLeads ${widgetType === 'reviews' ? 'Google Review' : 'Service Area'} Widget Embed -->\n<div id="localseo-widget"></div>\n<script src="${scriptUrl}"></script>`;
            }
        }
        embedCodeTextarea.value = embedCode;

        // Render Preview Box
        previewBox.innerHTML = '';
        updateBaseCssPreview(theme, layout, colorInput.value, clientId);
        updateCssPreview();

        // Style container based on theme
        if (theme === 'light') {
            previewBox.style.background = '#ffffff';
            previewBox.style.color = '#1f2937';
        } else if (theme === 'dark') {
            previewBox.style.background = '#1f2937';
            previewBox.style.color = '#f3f4f6';
        } else {
            previewBox.style.background = 'rgba(31, 41, 55, 0.4)';
            previewBox.style.backdropFilter = 'blur(10px)';
            previewBox.style.color = '#f3f4f6';
        }

        if (widgetType === 'seo-audit') {
            const iframeUrl = `${origin}/audit-widget.html?agencyId=${clientId}&theme=${theme}&color=${color}`;
            const iframe = document.createElement('iframe');
            iframe.src = iframeUrl;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.minHeight = '320px';
            iframe.style.border = 'none';
            iframe.style.borderRadius = '8px';
            previewBox.appendChild(iframe);
        } else if (widgetType === 'business-card') {
            previewBox.innerHTML = `
                <div style="width: 100%; border: 1px solid rgba(128,128,128,0.25); border-radius: 12px; padding: 1.5rem; text-align: left;">
                    <h3 style="margin: 0 0 10px 0; font-size: 1.15rem; color: #fff;">Apex Plumbing</h3>
                    <p style="font-size: 0.8rem; color: #9ca3af; margin-bottom: 12px; line-height: 1.4;">Premium plumbing solutions in Austin. Certified, licensed, and highly rated.</p>
                    <div style="font-size: 0.8rem; display: flex; flex-direction: column; gap: 6px;">
                        <div>📞 (555) 123-4567</div>
                        <div>✉️ contact@apexplumbing.com</div>
                        <div>📍 Austin, Texas</div>
                    </div>
                </div>
            `;
        } else if (widgetType === 'reviews') {
            const averageRating = 5.0;
            if (layout === 'badge') {
                previewBox.innerHTML = `
                    <div id="preview-badge-trigger" style="background: ${colorInput.value}; color: white; padding: 10px 18px; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 0.85rem; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                        ⭐ ${averageRating.toFixed(1)} (${mockReviews.length} Reviews)
                    </div>
                    <div id="preview-badge-modal" style="display: none; position: absolute; bottom: 70px; right: 20px; width: 280px; max-height: 250px; overflow-y: auto; background: ${theme === 'dark' ? '#111827' : '#ffffff'}; color: ${theme === 'dark' ? '#fff' : '#000'}; border: 1px solid rgba(128,128,128,0.25); border-radius: 12px; padding: 1rem; box-shadow: 0 8px 24px rgba(0,0,0,0.3); flex-direction: column; gap: 8px; z-index: 10;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; border-bottom: 1px solid rgba(128,128,128,0.15); padding-bottom: 5px; margin-bottom: 5px; font-weight: bold;">
                            <span>Google Reviews</span>
                            <span id="preview-close-modal" style="cursor: pointer;">&times;</span>
                        </div>
                        ${mockReviews.map(r => createReviewCard(r, clientId)).join('')}
                    </div>
                `;
                const trigger = previewBox.querySelector('#preview-badge-trigger');
                const modal = previewBox.querySelector('#preview-badge-modal');
                const closeBtn = previewBox.querySelector('#preview-close-modal');
                trigger.addEventListener('click', () => {
                    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
                });
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    modal.style.display = 'none';
                });
            } else if (layout === 'grid') {
                const cards = mockReviews.slice(0, 2).map(r => createReviewCard(r, clientId)).join('');
                previewBox.innerHTML = `
                    <div style="width: 100%; display: flex; flex-direction: column; gap: 10px;">
                        <h3 style="margin: 0; font-size: 1rem; color: #fff;">⭐ Google Reviews</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; width: 100%;">
                            ${cards}
                        </div>
                    </div>
                `;
            } else { // Carousel
                const slides = mockReviews.map((r, i) => `
                    <div class="ll-carousel-slide-${clientId}" style="${i === 0 ? 'display: block;' : 'display: none;'} min-width: 100%; width: 100%;">
                        ${createReviewCard(r, clientId)}
                    </div>
                `).join('');
                previewBox.innerHTML = `
                    <div style="width: 100%; display: flex; flex-direction: column; gap: 10px;">
                        <h3 style="margin: 0; font-size: 1rem; color: #fff;">⭐ Google Reviews</h3>
                        <div style="position: relative; overflow: hidden; width: 100%;">
                            <div style="display: flex; width: 100%;">
                                ${slides}
                            </div>
                        </div>
                        <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 10px; font-size: 0.8rem;">
                            <div id="preview-carousel-prev" style="cursor: pointer; padding: 4px 8px; border: 1px solid rgba(128,128,128,0.2); border-radius: 4px;">&lt;</div>
                            <div id="preview-carousel-index">1 / ${mockReviews.length}</div>
                            <div id="preview-carousel-next" style="cursor: pointer; padding: 4px 8px; border: 1px solid rgba(128,128,128,0.2); border-radius: 4px;">&gt;</div>
                        </div>
                    </div>
                `;
                let currentIndex = 0;
                const prevBtn = previewBox.querySelector('#preview-carousel-prev');
                const nextBtn = previewBox.querySelector('#preview-carousel-next');
                const indexDiv = previewBox.querySelector('#preview-carousel-index');
                const slidesEls = previewBox.querySelectorAll(`.ll-carousel-slide-${clientId}`);

                function showSlide(idx) {
                    slidesEls.forEach((slide, i) => {
                        slide.style.display = i === idx ? 'block' : 'none';
                    });
                    indexDiv.textContent = `${idx + 1} / ${mockReviews.length}`;
                }

                if (prevBtn && nextBtn) {
                    prevBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        currentIndex = (currentIndex - 1 + mockReviews.length) % mockReviews.length;
                        showSlide(currentIndex);
                    });
                    nextBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        currentIndex = (currentIndex + 1) % mockReviews.length;
                        showSlide(currentIndex);
                    });
                }
            }
        } else { // Service Area
            if (layout === 'badge') {
                previewBox.innerHTML = `
                    <div id="preview-badge-trigger" style="background: ${colorInput.value}; color: white; padding: 10px 18px; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 0.85rem; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                        📍 Locations We Serve
                    </div>
                    <div id="preview-badge-modal" style="display: none; position: absolute; bottom: 70px; right: 20px; width: 220px; max-height: 200px; overflow-y: auto; background: ${theme === 'dark' ? '#111827' : '#ffffff'}; color: ${theme === 'dark' ? '#fff' : '#000'}; border: 1px solid rgba(128,128,128,0.25); border-radius: 12px; padding: 1rem; box-shadow: 0 8px 24px rgba(0,0,0,0.3); flex-direction: column; gap: 8px; z-index: 10; text-align: left;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; border-bottom: 1px solid rgba(128,128,128,0.15); padding-bottom: 5px; margin-bottom: 5px; font-weight: bold;">
                            <span>Service Areas</span>
                            <span id="preview-close-modal" style="cursor: pointer;">&times;</span>
                        </div>
                        ${mockPages.map(p => `<a href="#" style="color: inherit; text-decoration: none; font-size: 0.8rem; display: block; margin-bottom: 5px;">📍 ${p.service} in ${p.town}</a>`).join('')}
                    </div>
                `;
                const trigger = previewBox.querySelector('#preview-badge-trigger');
                const modal = previewBox.querySelector('#preview-badge-modal');
                const closeBtn = previewBox.querySelector('#preview-close-modal');
                trigger.addEventListener('click', () => {
                    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
                });
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    modal.style.display = 'none';
                });
            } else if (layout === 'grid') {
                previewBox.innerHTML = `
                    <div style="width: 100%; display: flex; flex-direction: column; gap: 10px; text-align: left;">
                        <h3 style="margin: 0; font-size: 1rem; color: #fff;">📍 Service Areas</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; width: 100%;">
                            ${mockPages.map(p => `
                                <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border: 1px solid rgba(128,128,128,0.15); font-size: 0.75rem; text-align: center;">
                                    <strong>${p.town}</strong><br/>
                                    <span style="font-size: 0.65rem; opacity: 0.7;">${p.service}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else { // List
                previewBox.innerHTML = `
                    <div style="width: 100%; text-align: left; display: flex; flex-direction: column; gap: 8px;">
                        <h3 style="margin: 0; font-size: 1rem; color: #fff;">📍 Locations We Serve</h3>
                        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 6px;">
                            ${mockPages.map(p => `
                                <li style="background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 15px; font-size: 0.75rem;">
                                    ${p.service} - ${p.town}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }
        }
    }

    // Initialize Preview
    updateEmbedAndPreview();

    // Copy to Clipboard Action
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(embedCodeTextarea.value);
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Code Copied!';
            copyBtn.style.background = '#10b981';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy widget code: ', err);
            alert('Failed to copy embed code. Please select and copy manually.');
        }
    });
});
