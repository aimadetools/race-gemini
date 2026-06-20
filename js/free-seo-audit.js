document.addEventListener('DOMContentLoaded', () => {
    const auditForm = document.getElementById('audit-form');
    const auditResults = document.getElementById('audit-results');
    const websiteUrlInput = document.getElementById('website-url');

    auditForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const url = websiteUrlInput.value;
        
        if (!url) {
            auditResults.innerHTML = '<p class="error">Please enter a valid website URL.</p>';
            return;
        }

        auditResults.innerHTML = '<p>Auditing your website... This may take a moment.</p>';

        try {
            // In a real scenario, we would have a backend service to do this, to avoid CORS issues.
            // For this prototype, we'll have to rely on APIs that have CORS enabled, or use a backend.
            // Let's assume for now we have a serverless function to help us.
            const response = await fetch(`/api/free-audit?url=${encodeURIComponent(url)}`);
            
            if (!response.ok) {
                throw new Error('Failed to audit website.');
            }

            const data = await response.json();
            
            displayResults(data);

        } catch (error) {
            console.error(error);
            auditResults.innerHTML = `<p class="error">An error occurred while auditing your website. Please try again later.</p>`;
        }
    });

    function displayResults(data) {
        if (!data.foundPages || !data.missedOpportunities) {
            auditResults.innerHTML = `<p class="error">Could not retrieve audit results.</p>`;
            return;
        }

        // Generate the 3x3 Grid Heatmap HTML
        let gridHtml = '';
        if (data.grid && Array.isArray(data.grid)) {
            gridHtml = `
                <div class="heatmap-section-wrapper" style="margin: 2.5rem 0; padding: 2rem; background: rgba(17, 24, 39, 0.4); border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0,0,0,0.25);">
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <h4 style="font-size: 1.3rem; margin: 0; color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-map-location-dot" style="color: #10b981;"></i> Local Visibility Heatmap Grid
                        </h4>
                        <p style="margin: 0.5rem 0 0 0; color: #9ca3af; font-size: 0.9rem;">
                            Showing your search ranking visibility and opportunities in towns surrounding <strong style="color: #fff;">${data.address.split(',')[0]}</strong>.
                        </p>
                    </div>
                    
                    <div class="seo-grid-heatmap" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; max-width: 420px; margin: 0 auto;">
                        ${data.grid.map((cell, idx) => {
                            const isCenter = cell.direction === 'CTR';
                            const isVisible = cell.status === 'visible';
                            const cellBg = isCenter 
                                ? 'rgba(16, 185, 129, 0.12)' 
                                : (isVisible ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)');
                            const cellBorder = isCenter
                                ? 'rgba(16, 185, 129, 0.45)'
                                : (isVisible ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)');
                            const badgeBg = isVisible ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
                            const badgeColor = isVisible ? '#34d399' : '#f87171';
                            const statusText = isVisible ? `Rank: #${cell.rank}` : 'Not Ranked';
                            
                            return `
                                <div class="seo-grid-cell ${cell.direction.toLowerCase()}" 
                                     data-index="${idx}"
                                     style="background: ${cellBg}; border: 1px solid ${cellBorder}; border-radius: 12px; padding: 1rem 0.5rem; text-align: center; position: relative; transition: all 0.3s ease; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100px; cursor: pointer;"
                                     onclick="window.selectHeatmapCell(${idx})"
                                     onmouseover="this.style.transform='translateY(-3px)'; this.style.borderColor='rgba(255,255,255,0.3)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.3)';"
                                     onmouseout="this.style.transform='none'; this.style.borderColor='${cellBorder}'; this.style.boxShadow='none';">
                                    
                                    <!-- Direction / Label -->
                                    <span style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; margin-bottom: 0.2rem;">
                                        ${cell.label}
                                    </span>
                                    
                                    <!-- City name -->
                                    <span style="font-weight: 700; font-size: 0.85rem; color: #fff; line-height: 1.2; margin-bottom: 0.35rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">
                                        ${cell.name}
                                    </span>
                                    
                                    <!-- Status badge -->
                                    <span style="font-size: 0.7rem; font-weight: 600; padding: 0.15rem 0.4rem; border-radius: 20px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid rgba(${isVisible ? '16,185,129' : '239,68,68'},0.2);">
                                        ${statusText}
                                    </span>
                                    
                                    <!-- Pulsing indicator -->
                                    <span class="node-pulse" style="position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; border-radius: 50%; background: ${isVisible ? '#10b981' : '#ef4444'}; box-shadow: 0 0 6px ${isVisible ? '#10b981' : '#ef4444'};"></span>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <!-- Cell Detail Panel -->
                    <div id="grid-cell-detail-panel" style="margin-top: 1.5rem; padding: 1.2rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; text-align: left; display: none;">
                        <h5 id="detail-cell-title" style="margin: 0 0 0.5rem 0; color: #fff; font-size: 1.05rem; font-weight: 700;">Town Details</h5>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.85rem; color: #cbd5e1;">
                            <div>Est. Searches/mo: <strong id="detail-cell-volume" style="color: #60a5fa;">-</strong></div>
                            <div>Visibility: <strong id="detail-cell-status" style="color: #fff;">-</strong></div>
                            <div style="grid-column: 1 / -1; margin-top: 0.5rem;" id="detail-cell-action-container"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        window.selectHeatmapCell = (idx) => {
            if (!data.grid || !data.grid[idx]) return;
            const cell = data.grid[idx];
            
            const panel = document.getElementById('grid-cell-detail-panel');
            const title = document.getElementById('detail-cell-title');
            const volume = document.getElementById('detail-cell-volume');
            const status = document.getElementById('detail-cell-status');
            const actionContainer = document.getElementById('detail-cell-action-container');
            
            // Highlight active cell visually
            document.querySelectorAll('.seo-grid-cell').forEach((el, index) => {
                const cBorder = data.grid[index].direction === 'CTR' 
                    ? 'rgba(16, 185, 129, 0.45)' 
                    : (data.grid[index].status === 'visible' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)');
                el.style.boxShadow = index === idx ? '0 0 10px rgba(96, 165, 250, 0.4)' : 'none';
                el.style.borderColor = index === idx ? '#60a5fa' : cBorder;
            });

            title.innerHTML = `<span style="color:#60a5fa;">${cell.label} Region:</span> ${cell.name}`;
            volume.textContent = `${cell.searchVolume} / mo`;
            
            const isVisible = cell.status === 'visible';
            status.textContent = isVisible ? `Visible (Rank #${cell.rank})` : 'Not Mentioned (Unranked)';
            status.style.color = isVisible ? '#34d399' : '#f87171';
            
            if (isVisible) {
                actionContainer.innerHTML = `
                    <div style="padding: 0.6rem; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.15); border-radius: 6px; color: #34d399; font-size: 0.8rem; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-circle-check"></i> <span>Your site is optimized and ranking for this target region!</span>
                    </div>
                `;
            } else {
                actionContainer.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 0.6rem;">
                        <div style="color: #ef4444; font-size: 0.8rem; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-triangle-exclamation"></i> <span>No localized content targeting this city was found.</span>
                        </div>
                        <a href="/agency-signup.html" style="display: inline-block; padding: 0.5rem 1rem; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #fff; font-size: 0.8rem; font-weight: 700; border-radius: 6px; text-decoration: none; text-align: center; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                            Claim Location - Generate Landing Page <i class="fa-solid fa-arrow-right" style="margin-left:4px;"></i>
                        </a>
                    </div>
                `;
            }
            
            panel.style.display = 'block';
        };

        let resultsHTML = `
            <h3>Audit Results</h3>
            <p>We analyzed your website and found the following:</p>
            <h4>Your current local SEO reach:</h4>
            <ul>
                ${data.foundPages.map(page => `<li>${page}</li>`).join('')}
            </ul>
            
            ${gridHtml}

            <h4>Missed opportunities:</h4>
            <p>You could be reaching customers in these nearby towns:</p>
            <ul>
                ${data.missedOpportunities.map(town => `<li>${town}</li>`).join('')}
            </ul>
            <div class="call-to-action">
                <h4>Ready to reach these customers?</h4>
                <p>Enter your email below and we'll send you a detailed report on how to generate pages for these locations.</p>
                <form id="email-capture-form">
                    <input type="email" id="email-input" placeholder="Enter your email" required>
                    <button type="submit">Get My Report</button>
                </form>
            </div>
        `;

        auditResults.innerHTML = resultsHTML;

        // Auto-select center cell
        if (data.grid && Array.isArray(data.grid)) {
            setTimeout(() => {
                window.selectHeatmapCell(4); // Select Center
            }, 100);
        }

        const emailCaptureForm = document.getElementById('email-capture-form');
        emailCaptureForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email-input').value;
            
            try {
                const response = await fetch('/api/capture-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, url: websiteUrlInput.value }),
                });

                if (!response.ok) {
                    throw new Error('Failed to capture email.');
                }

                auditResults.innerHTML += '<p>Thank you! Your report is on its way.</p>';
                emailCaptureForm.style.display = 'none';

            } catch (error) {
                console.error('Error capturing email:', error);
                auditResults.innerHTML += '<p class="error">Could not save your email. Please try again later.</p>';
            }
        });
    }
});
