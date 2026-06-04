import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { clientId, theme = 'glassmorphic', layout = 'badge' } = req.query;

    if (!clientId) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.status(200).send('/* LocalLeads Widget: Missing clientId parameter */');
    }

    const parsedClientId = parseInt(clientId, 10);
    if (isNaN(parsedClientId)) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.status(200).send('/* LocalLeads Widget: Invalid clientId parameter */');
    }

    try {
        // Query user info
        const userResult = await query(
            'SELECT referral_code, custom_domain, primary_color FROM users WHERE id = $1',
            [parsedClientId]
        );

        if (userResult.rows.length === 0) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            return res.status(200).send('/* LocalLeads Widget: Client profile not found */');
        }

        const user = userResult.rows[0];

        // Query SEO pages
        const pagesResult = await query(
            'SELECT service, town, file_name FROM seo_pages WHERE user_id = $1 ORDER BY town, service',
            [parsedClientId]
        );

        if (pagesResult.rows.length === 0) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            return res.status(200).send('/* LocalLeads Widget: No pages generated yet */');
        }

        // Determine widget color
        let widgetColor = req.query.color || user.primary_color || '3b82f6';
        if (widgetColor && !widgetColor.startsWith('#')) {
            widgetColor = '#' + widgetColor;
        }

        // Clean domain and referral
        const customDomain = user.custom_domain ? user.custom_domain.trim() : null;
        const referralCode = user.referral_code ? user.referral_code.trim() : null;

        const pagesJson = JSON.stringify(pagesResult.rows.map(row => ({
            service: row.service,
            town: row.town,
            fileName: row.file_name
        })));

        // Core dynamic Javascript output
        const scriptCode = `
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

    let baseUrl = 'https://www.localseogen.com';
    if (customDomain) {
        baseUrl = 'https://' + customDomain;
    }

    // Determine referral url
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
                font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                box-sizing: border-box;
                margin: 1rem 0;
            }
            .ll-widget-container-\${clientId} * {
                box-sizing: border-box;
            }
            .ll-widget-title-\${clientId} {
                font-size: 1.25rem;
                font-weight: 700;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .ll-widget-grid-\${clientId} {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 12px;
            }
            .ll-widget-card-\${clientId} {
                border-radius: 8px;
                padding: 1rem;
                text-decoration: none;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                border: 1px solid rgba(0,0,0,0.08);
            }
            .ll-widget-card-\${clientId}:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .ll-widget-card-town-\${clientId} {
                font-weight: 700;
                font-size: 0.95rem;
                margin-bottom: 4px;
            }
            .ll-widget-card-service-\${clientId} {
                font-size: 0.85rem;
                opacity: 0.8;
            }
            .ll-widget-list-\${clientId} {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .ll-widget-list-item-\${clientId} a {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 0.85rem;
                text-decoration: none;
                font-weight: 500;
                transition: background 0.2s ease, transform 0.1s ease;
                border: 1px solid rgba(0,0,0,0.08);
            }
            .ll-widget-list-item-\${clientId} a:hover {
                transform: scale(1.02);
            }
            .ll-widget-footer-\${clientId} {
                margin-top: 1rem;
                font-size: 0.75rem;
                opacity: 0.6;
                text-align: right;
            }
            .ll-widget-footer-\${clientId} a {
                color: inherit;
                text-decoration: underline;
                font-weight: 600;
            }

            /* Theme overrides */
            /* Light */
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

            /* Dark */
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

            /* Glassmorphic */
            .ll-theme-glassmorphic-\${clientId} .ll-widget-card-\${clientId} {
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                color: inherit;
                border-color: rgba(255, 255, 255, 0.1);
            }
            .ll-theme-glassmorphic-\${clientId} .ll-widget-card-\${clientId}:hover {
                border-color: \${baseColor};
                background: rgba(255, 255, 255, 0.08);
            }
            .ll-theme-glassmorphic-\${clientId} .ll-widget-list-item-\${clientId} a {
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                color: inherit;
                border-color: rgba(255, 255, 255, 0.1);
            }
            .ll-theme-glassmorphic-\${clientId} .ll-widget-list-item-\${clientId} a:hover {
                background: \${baseColor};
                color: #ffffff;
                border-color: \${baseColor};
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
        style.textContent = styles;
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
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            } else {
                modal.style.display = 'flex';
            }
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
        let container = document.getElementById('localseo-widget');
        if (!container) {
            container = document.querySelector('.localseo-widget');
        }
        if (!container) return; // safety check

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

        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.status(200).send(scriptCode);

    } catch (error) {
        await logError(error, 'Widget serving error');
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.status(500).send('/* LocalLeads Widget: Internal server error */');
    }
}
