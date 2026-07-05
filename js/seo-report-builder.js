document.addEventListener('DOMContentLoaded', async () => {
    const jwtToken = localStorage.getItem('token');
    if (!jwtToken) {
        window.location.href = '/auth.html';
        return;
    }

    // Dom elements - Configurator
    const repClientNameInput = document.getElementById('rep-client-name');
    const repPreparedByInput = document.getElementById('rep-prepared-by');
    const repLogoUrlInput = document.getElementById('rep-logo-url');
    const repColorPicker = document.getElementById('rep-color-picker');
    const repColorHex = document.getElementById('rep-color-hex');
    const repFilterTown = document.getElementById('rep-filter-town');
    const repFilterService = document.getElementById('rep-filter-service');
    const repCustomNotes = document.getElementById('rep-custom-notes');

    // Modules checkboxes
    const modSummary = document.getElementById('mod-summary');
    const modChart = document.getElementById('mod-chart');
    const modReputation = document.getElementById('mod-reputation');
    const modTable = document.getElementById('mod-table');

    // Dom elements - Preview Display
    const reportImgLogo = document.getElementById('report-img-logo');
    const reportTitleDisplay = document.getElementById('report-title-display');
    const reportClientDisplay = document.getElementById('report-client-display');
    const reportByDisplay = document.getElementById('report-by-display');
    const reportDateDisplay = document.getElementById('report-date-display');
    const reportFooterDate = document.getElementById('report-footer-date');
    const reportNotesDisplay = document.getElementById('report-notes-display');

    // Metrics elements
    const msTotalPages = document.getElementById('ms-total-pages');
    const msIndexingRate = document.getElementById('ms-indexing-rate');
    const msTotalViews = document.getElementById('ms-total-views');
    const msLeadsCaptured = document.getElementById('ms-leads-captured');
    const msConversionRate = document.getElementById('ms-conversion-rate');

    // Sections containers
    const secSummary = document.getElementById('report-sec-summary');
    const secChart = document.getElementById('report-sec-chart');
    const secReputation = document.getElementById('report-sec-reputation');
    const secTable = document.getElementById('report-sec-table');

    // Table elements
    const topPagesTableBody = document.querySelector('#report-top-pages-table tbody');

    // Chart.js instance variable
    let reportChartInstance = null;

    // Cache variables
    let rawDashboardData = null;
    let rawTestimonials = null;
    let selectedAccentColor = '#3b82f6';

    // Set today's date
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    if (reportDateDisplay) reportDateDisplay.textContent = today;
    if (reportFooterDate) reportFooterDate.textContent = today;

    // Fetch initial data
    try {
        await loadData();
    } catch (err) {
        console.error('Error initializing report builder:', err);
    }

    // Primary load data function
    async function loadData() {
        const townVal = repFilterTown ? repFilterTown.value : '';
        const serviceVal = repFilterService ? repFilterService.value : '';
        
        let url = '/api/dashboard';
        const queryParams = [];
        if (townVal) queryParams.push(`town=${encodeURIComponent(townVal)}`);
        if (serviceVal) queryParams.push(`service=${encodeURIComponent(serviceVal)}`);
        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&');
        }

        const dashboardPromise = fetch(url, {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        }).then(res => res.json());

        const testimonialsPromise = fetch('/api/testimonials', {
            headers: { 'Authorization': `Bearer ${jwtToken}` }
        }).then(res => res.json()).catch(err => {
            console.error('Failed to load testimonials:', err);
            return { testimonials: [] };
        });

        const [dashboardData, testimonialsData] = await Promise.all([dashboardPromise, testimonialsPromise]);
        
        rawDashboardData = dashboardData;
        rawTestimonials = testimonialsData.testimonials || [];

        // Auto-fill client details if business profile exists
        if (rawDashboardData.businessProfile && !repClientNameInput.dataset.modified) {
            const bizName = rawDashboardData.businessProfile.name || rawDashboardData.businessProfile.businessName || '';
            if (bizName) {
                repClientNameInput.value = bizName;
                reportClientDisplay.textContent = bizName;
                repClientNameInput.dataset.modified = "true";
            }
        }

        populateFilters();
        updateReportView();
    }

    function populateFilters() {
        if (!rawDashboardData || !rawDashboardData.generatedPages) return;
        
        const pages = rawDashboardData.generatedPages;
        const uniqueTowns = [...new Set(pages.map(p => p.town).filter(Boolean))].sort();
        const uniqueServices = [...new Set(pages.map(p => p.service).filter(Boolean))].sort();

        // Populate towns dropdown if empty (preserve selection)
        if (repFilterTown.options.length <= 1) {
            const currentTown = repFilterTown.value;
            repFilterTown.innerHTML = '<option value="">All Towns</option>';
            uniqueTowns.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                if (t === currentTown) opt.selected = true;
                repFilterTown.appendChild(opt);
            });
        }

        // Populate services dropdown if empty (preserve selection)
        if (repFilterService.options.length <= 1) {
            const currentService = repFilterService.value;
            repFilterService.innerHTML = '<option value="">All Services</option>';
            uniqueServices.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                if (s === currentService) opt.selected = true;
                repFilterService.appendChild(opt);
            });
        }
    }

    function updateReportView() {
        if (!rawDashboardData) return;

        const pages = rawDashboardData.generatedPages || [];
        const leads = rawDashboardData.leads || [];

        // Filter arrays based on selected UI dropdowns
        const selectedTown = repFilterTown.value;
        const selectedService = repFilterService.value;

        const filteredPages = pages.filter(p => {
            if (selectedTown && p.town !== selectedTown) return false;
            if (selectedService && p.service !== selectedService) return false;
            return true;
        });

        // Filter leads based on page URLs or page mappings
        const filteredLeads = leads.filter(l => {
            if (!selectedTown && !selectedService) return true;
            
            // Attempt to resolve page of lead
            const leadPageUrl = l.url || '';
            const matchingPage = pages.find(p => leadPageUrl.includes(p.slug) || (p.url && leadPageUrl.includes(p.url)));
            
            if (matchingPage) {
                if (selectedTown && matchingPage.town !== selectedTown) return false;
                if (selectedService && matchingPage.service !== selectedService) return false;
            }
            return true;
        });

        // Calculate stats
        const totalPages = filteredPages.length;
        const indexedPagesCount = filteredPages.filter(p => p.indexingStatus && p.indexingStatus.toLowerCase().includes('indexed')).length;
        const indexRate = totalPages > 0 ? Math.round((indexedPagesCount / totalPages) * 100) : 0;
        
        const totalViews = filteredPages.reduce((sum, p) => sum + (p.views || 0), 0);
        const totalLeads = filteredLeads.length;
        const conversionRate = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : '0.0';

        // Update summaries
        if (msTotalPages) msTotalPages.textContent = totalPages;
        if (msIndexingRate) msIndexingRate.textContent = `${indexRate}%`;
        if (msTotalViews) msTotalViews.textContent = totalViews;
        if (msLeadsCaptured) msLeadsCaptured.textContent = totalLeads;
        if (msConversionRate) msConversionRate.textContent = `${conversionRate}%`;

        // Render top pages table
        if (topPagesTableBody) {
            topPagesTableBody.innerHTML = '';
            
            // Sort by views descending
            const sortedPages = [...filteredPages].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
            
            if (sortedPages.length > 0) {
                sortedPages.forEach(p => {
                    const row = topPagesTableBody.insertRow();
                    
                    let statusBadgeStyle = 'background: rgba(156, 163, 175, 0.1); color: #9ca3af;';
                    let statusText = p.indexingStatus || 'Unknown';
                    
                    if (statusText.toLowerCase().includes('indexed')) {
                        statusBadgeStyle = 'background: rgba(16, 185, 129, 0.1); color: #34d399;';
                    } else if (statusText.toLowerCase().includes('queued') || statusText.toLowerCase().includes('crawled')) {
                        statusBadgeStyle = 'background: rgba(245, 158, 11, 0.1); color: #fbbf24;';
                    } else if (statusText.toLowerCase().includes('failed') || statusText.toLowerCase().includes('error')) {
                        statusBadgeStyle = 'background: rgba(239, 68, 68, 0.1); color: #f87171;';
                    }

                    row.innerHTML = `
                        <td style="font-weight: 600; color: #fff;">${p.town} (${p.zipCode || ''})</td>
                        <td>${p.service}</td>
                        <td style="font-weight: bold;">${p.views || 0}</td>
                        <td>${p.uniqueVisitors || 0}</td>
                        <td><span style="padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; ${statusBadgeStyle}">${statusText}</span></td>
                    `;
                });
            } else {
                topPagesTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #6b7280; padding: 1.5rem;">No active landing pages matching filters.</td></tr>';
            }
        }

        // Render Chart.js
        renderChart();

        // Render Reviews Sentiment
        renderReviewsSentiment();
    }

    function renderChart() {
        const chartCanvas = document.getElementById('reportChart');
        if (!chartCanvas || !rawDashboardData || !rawDashboardData.dailyStats) return;

        const stats = rawDashboardData.dailyStats;
        const labels = stats.map(s => {
            const parts = s.date.split('-');
            if (parts.length === 3) {
                const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
                return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            return s.date;
        });
        const viewsData = stats.map(s => s.views);
        const leadsData = stats.map(s => s.leads);

        if (reportChartInstance) {
            reportChartInstance.destroy();
        }

        const ctx = chartCanvas.getContext('2d');
        reportChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Page Views',
                        data: viewsData,
                        borderColor: selectedAccentColor,
                        backgroundColor: hexToRgba(selectedAccentColor, 0.1),
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Leads Captured',
                        data: '#10b981',
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: isPrinterFriendly() ? '#374151' : '#f3f4f6',
                            font: { family: "'Inter', sans-serif", size: 11 }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: isPrinterFriendly() ? '#e5e7eb' : 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: isPrinterFriendly() ? '#4b5563' : '#9ca3af', maxTicksLimit: 10 }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: isPrinterFriendly() ? '#e5e7eb' : 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: isPrinterFriendly() ? '#4b5563' : '#9ca3af', stepSize: 1 },
                        title: { display: true, text: 'Page Views', color: selectedAccentColor }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: isPrinterFriendly() ? '#4b5563' : '#9ca3af', stepSize: 1 },
                        title: { display: true, text: 'Leads Captured', color: '#10b981' }
                    }
                }
            }
        });
    }

    function renderReviewsSentiment() {
        const testimonials = rawTestimonials || [];
        const total = testimonials.length;

        const ratingNum = document.getElementById('rep-rating-num');
        const ratingStars = document.getElementById('rep-rating-stars');
        const ratingCount = document.getElementById('rep-rating-count');

        const posText = document.getElementById('rep-pos-text');
        const posBar = document.getElementById('rep-pos-bar');
        const neuText = document.getElementById('rep-neu-text');
        const neuBar = document.getElementById('rep-neu-bar');
        const negText = document.getElementById('rep-neg-text');
        const negBar = document.getElementById('rep-neg-bar');

        if (!ratingNum) return;

        if (total === 0) {
            ratingNum.textContent = '0.0';
            ratingStars.textContent = '☆☆☆☆☆';
            ratingCount.textContent = '0 reviews';
            
            posText.textContent = '0% (0)';
            posBar.style.width = '0%';
            
            neuText.textContent = '0% (0)';
            neuBar.style.width = '0%';
            
            negText.textContent = '0% (0)';
            negBar.style.width = '0%';
            return;
        }

        let sum = 0;
        let posCount = 0;
        let neuCount = 0;
        let negCount = 0;

        testimonials.forEach(t => {
            const r = parseInt(t.rating, 10);
            sum += r;
            if (r >= 4) posCount++;
            else if (r === 3) neuCount++;
            else negCount++;
        });

        const avg = (sum / total).toFixed(1);
        const starsText = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));

        ratingNum.textContent = avg;
        ratingStars.textContent = starsText;
        ratingCount.textContent = `${total} review${total === 1 ? '' : 's'}`;

        const posPct = Math.round((posCount / total) * 100);
        const neuPct = Math.round((neuCount / total) * 100);
        const negPct = Math.round((negCount / total) * 100);

        posText.textContent = `${posPct}% (${posCount})`;
        posBar.style.width = `${posPct}%`;

        neuText.textContent = `${neuPct}% (${neuCount})`;
        neuBar.style.width = `${neuPct}%`;

        negText.textContent = `${negPct}% (${negCount})`;
        negBar.style.width = `${negPct}%`;
    }

    // Helper functions
    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function isPrinterFriendly() {
        return window.matchMedia && window.matchMedia('print').matches;
    }

    // Event listeners - Configurator inputs sync
    repClientNameInput.addEventListener('input', (e) => {
        repClientNameInput.dataset.modified = "true";
        reportClientDisplay.textContent = e.target.value || 'Springfield Plumbing';
    });

    repPreparedByInput.addEventListener('input', (e) => {
        reportByDisplay.textContent = e.target.value || 'LocalLeads';
    });

    repLogoUrlInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        if (url) {
            reportImgLogo.src = url;
            reportImgLogo.style.display = 'block';
        } else {
            reportImgLogo.src = '/images/logo.svg';
        }
    });

    repCustomNotes.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        reportNotesDisplay.innerHTML = val ? val.replace(/\n/g, '<br>') : 'No custom recommendations provided. Add notes in the customizer panel on the left.';
    });

    // Color picker synchronization
    repColorPicker.addEventListener('input', (e) => {
        const color = e.target.value;
        repColorHex.value = color;
        updateAccentColor(color);
    });

    repColorHex.addEventListener('input', (e) => {
        const color = e.target.value;
        if (/^#[0-9A-F]{6}$/i.test(color)) {
            repColorPicker.value = color;
            updateAccentColor(color);
        }
    });

    function updateAccentColor(color) {
        selectedAccentColor = color;
        document.documentElement.style.setProperty('--accent-color', color);
        document.documentElement.style.setProperty('--accent-glow', hexToRgba(color, 0.2));
        
        // Dynamic border color update on live card
        const header = document.querySelector('.report-header');
        if (header) header.style.borderColor = color;
        
        const sectionHeaders = document.querySelectorAll('.report-section h3');
        sectionHeaders.forEach(sh => sh.style.borderColor = color);

        renderChart();
    }

    // Filters reload data
    repFilterTown.addEventListener('change', () => loadData());
    repFilterService.addEventListener('change', () => loadData());

    // Section displays toggles
    modSummary.addEventListener('change', (e) => {
        secSummary.style.display = e.target.checked ? 'block' : 'none';
    });
    modChart.addEventListener('change', (e) => {
        secChart.style.display = e.target.checked ? 'block' : 'none';
    });
    modReputation.addEventListener('change', (e) => {
        secReputation.style.display = e.target.checked ? 'block' : 'none';
    });
    modTable.addEventListener('change', (e) => {
        secTable.style.display = e.target.checked ? 'block' : 'none';
    });

    // Print button trigger
    const btnTriggerPrint = document.getElementById('btn-trigger-print');
    if (btnTriggerPrint) {
        btnTriggerPrint.addEventListener('click', () => {
            window.print();
        });
    }

    // Listen to media query match print for auto redrawing chart context
    window.matchMedia('print').addListener(() => {
        renderChart();
    });
});
