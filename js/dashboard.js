document.addEventListener('DOMContentLoaded', () => {
    const userEmailSpan = document.getElementById('user-email');
    const userCreditsSpan = document.getElementById('user-credits');
    const generatedPagesTableBody = document.querySelector('#generated-pages tbody');

    // Only run this on the user dashboard page
    if (!userEmailSpan && !userCreditsSpan && !generatedPagesTableBody) {
        return;
    }

    const jwtToken = localStorage.getItem('token');
    if (!jwtToken) {
        window.location.href = '/auth.html';
        return;
    }

    const onboardingMessage = document.getElementById('dashboard-onboarding-message');
    const dismissOnboardingButton = document.getElementById('dismiss-dashboard-onboarding');

    // Modal elements
    const editModal = document.getElementById('edit-page-modal');
    const deleteModal = document.getElementById('delete-page-modal');
    const editForm = document.getElementById('edit-page-form');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    // Toggle AI Style group visibility on Edit Page modal
    const editEnableAICopyCheckbox = document.getElementById('edit-enable-ai-copy');
    const editAiStyleGroup = document.getElementById('edit-ai-style-group');
    if (editEnableAICopyCheckbox && editAiStyleGroup) {
        editEnableAICopyCheckbox.addEventListener('change', function () {
            editAiStyleGroup.style.display = this.checked ? 'block' : 'none';
        });
    }

    // Testimonials Elements
    const testimonialModal = document.getElementById('add-testimonial-modal');
    const addTestimonialBtn = document.getElementById('add-testimonial-btn');
    const closeTestimonialModal = document.getElementById('close-testimonial-modal');
    const cancelTestimonialBtn = document.getElementById('cancel-testimonial-btn');
    const addTestimonialForm = document.getElementById('add-testimonial-form');
    const testimonialsTableBody = document.querySelector('#testimonials-card tbody');
    const reviewLinkInput = document.getElementById('review-link-input');
    const copyReviewLinkBtn = document.getElementById('copy-review-link-btn');

    let userPages = [];
    let activeServiceFilters = new Set();
    let activeTownFilters = new Set();
    let searchQuery = '';
    let currentDashboardData = null;


    async function fetchDashboardData() {
        try {
            const response = await fetch('/api/dashboard', {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                // Populate user info
                if (userEmailSpan) {
                    userEmailSpan.textContent = data.email;
                }
                if (userCreditsSpan) {
                    userCreditsSpan.textContent = data.credits !== undefined ? data.credits : 'N/A';
                }

                // Populate custom domain details
                const customDomainInput = document.getElementById('custom-domain-input');
                const customDomainRedirectInput = document.getElementById('custom-domain-redirect-input');
                if (customDomainInput) {
                    customDomainInput.value = data.customDomain || '';
                }
                if (customDomainRedirectInput) {
                    customDomainRedirectInput.value = data.customDomainRedirect || '';
                }

                // Populate generated pages
                if (data.generatedPages && data.generatedPages.length > 0) {
                    userPages = data.generatedPages;
                } else {
                    userPages = [];
                }

                // Clean up active filters that are no longer in the retrieved page list
                const uniqueServices = new Set(userPages.map(p => p.service).filter(Boolean));
                const uniqueTowns = new Set(userPages.map(p => p.town).filter(Boolean));

                for (const service of activeServiceFilters) {
                    if (!uniqueServices.has(service)) {
                        activeServiceFilters.delete(service);
                    }
                }
                for (const town of activeTownFilters) {
                    if (!uniqueTowns.has(town)) {
                        activeTownFilters.delete(town);
                    }
                }

                populateTagFilters();
                renderFilteredPages();

                // Populate captured leads
                const leadsTableBody = document.querySelector('#captured-leads tbody');
                if (leadsTableBody) {
                    leadsTableBody.innerHTML = '';
                    
                    const existingBanner = document.getElementById('leads-unlock-banner');
                    if (existingBanner) {
                        existingBanner.remove();
                    }

                    if (data.leads && data.leads.length > 0) {
                        data.leads.forEach(lead => {
                            const row = leadsTableBody.insertRow();
                            const formattedDate = new Date(lead.created_at).toLocaleDateString();
                            const pageUrl = lead.url || '#';
                            const pageText = lead.url ? lead.url.split('/').pop() : 'View Page';
                            
                            const emailHtml = lead.isLocked 
                                ? `<span style="background: rgba(239, 68, 68, 0.1); color: #f87171; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 0.85rem; border: 1px solid rgba(239, 68, 68, 0.2); white-space: nowrap;"><i class="fas fa-lock" style="font-size: 0.75rem; margin-right: 4px;"></i> ${lead.email}</span>` 
                                : `<a href="mailto:${lead.email}">${lead.email}</a>`;
                            
                            const phoneHtml = lead.isLocked 
                                ? `<span style="background: rgba(239, 68, 68, 0.1); color: #f87171; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 0.85rem; border: 1px solid rgba(239, 68, 68, 0.2); white-space: nowrap;"><i class="fas fa-lock" style="font-size: 0.75rem; margin-right: 4px;"></i> ${lead.phone || 'N/A'}</span>` 
                                : (lead.phone ? `<a href="tel:${lead.phone}">${lead.phone}</a>` : 'N/A');
                            
                            const statusHtml = lead.isLocked 
                                ? `<span class="credit-negative" style="font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-lock" style="font-size: 0.75rem;"></i> Locked</span>` 
                                : `<span class="credit-positive" style="font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-check-circle" style="font-size: 0.75rem;"></i> Active</span>`;

                            row.innerHTML = `
                                <td style="font-weight: 600; color: #fff;">${lead.name}</td>
                                <td>${emailHtml}</td>
                                <td>${phoneHtml}</td>
                                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${lead.message || ''}">${lead.message || 'N/A'}</td>
                                <td><a href="${pageUrl}" target="_blank" style="color: #60a5fa; text-decoration: underline;">${pageText}</a></td>
                                <td>${formattedDate}</td>
                                <td>${statusHtml}</td>
                            `;
                        });

                        if (!data.isPaidUser) {
                            const unlockBanner = document.createElement('div');
                            unlockBanner.id = 'leads-unlock-banner';
                            unlockBanner.style.cssText = `
                                background: linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(29, 78, 216, 0.15) 100%);
                                border: 1px solid rgba(59, 130, 246, 0.3);
                                border-radius: 12px;
                                padding: 1.25rem;
                                margin-bottom: 1.5rem;
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                gap: 1rem;
                                flex-wrap: wrap;
                                text-align: left;
                            `;
                            unlockBanner.innerHTML = `
                                <div style="flex: 1; min-width: 250px;">
                                    <h4 style="margin: 0 0 0.25rem 0; color: #fff; font-size: 1.05rem; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                                        <i class="fas fa-lock" style="color: #60a5fa;"></i> Lead Contact Info Locked
                                    </h4>
                                    <p style="margin: 0; color: #9ca3af; font-size: 0.85rem; line-height: 1.4;">
                                        Upgrade to a paid pack (from $49 one-time) to reveal emails and phone numbers for all captured leads and secure immediate contact.
                                    </p>
                                </div>
                                <a href="/pricing.html" class="button" style="padding: 0.6rem 1.2rem; font-size: 0.85rem; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); white-space: nowrap; text-align: center;">
                                    Upgrade & Unlock
                                </a>
                            `;
                            const card = document.getElementById('captured-leads-card');
                            if (card) {
                                card.insertBefore(unlockBanner, document.getElementById('captured-leads'));
                            }
                        }
                    } else {
                        leadsTableBody.innerHTML = '<tr><td colspan="7">No leads captured yet. Leads will appear here when visitors contact you from your generated pages.</td></tr>';
                    }
                }

                // Populate credit transaction history
                const creditTransactionsTableBody = document.querySelector('#credit-transactions tbody');
                if (creditTransactionsTableBody) {
                    creditTransactionsTableBody.innerHTML = '';
                    if (data.creditTransactions && data.creditTransactions.length > 0) {
                        data.creditTransactions.forEach(transaction => {
                            const row = creditTransactionsTableBody.insertRow();
                            const formattedDate = new Date(transaction.date).toLocaleDateString();
                            const amountClass = transaction.amount > 0 ? 'credit-positive' : 'credit-negative';
                            row.innerHTML = `
                                <td>${formattedDate}</td>
                                <td>${transaction.description}</td>
                                <td class="${amountClass}">${transaction.amount}</td>
                            `;
                        });
                    } else {
                        creditTransactionsTableBody.innerHTML = '<tr><td colspan="3">No transactions found.</td></tr>';
                    }
                }

                // Populate indexing notifications
                const indexingNotificationsTableBody = document.querySelector('#indexing-notifications tbody');
                if (indexingNotificationsTableBody) {
                    indexingNotificationsTableBody.innerHTML = '';
                    if (data.indexingNotifications && data.indexingNotifications.length > 0) {
                        data.indexingNotifications.forEach(notification => {
                            const row = indexingNotificationsTableBody.insertRow();
                            const formattedDate = new Date(notification.timestamp).toLocaleString();
                            const statusClass = notification.status === 'success' ? 'credit-positive' : 'credit-negative';
                            const statusText = notification.status === 'success' ? 'Completed' : 'Failed';
                            row.innerHTML = `
                                <td>${formattedDate}</td>
                                <td>${notification.message}</td>
                                <td class="${statusClass}">${statusText}</td>
                            `;
                        });
                    } else {
                        indexingNotificationsTableBody.innerHTML = '<tr><td colspan="3">No indexing notifications found.</td></tr>';
                    }
                }

                // Render visual chart of page views and lead conversions
                const chartCanvas = document.getElementById('analyticsChart');
                if (chartCanvas && data.dailyStats && data.dailyStats.length > 0) {
                    const labels = data.dailyStats.map(s => {
                        const parts = s.date.split('-');
                        if (parts.length === 3) {
                            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
                            return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                        return s.date;
                    });
                    const viewsData = data.dailyStats.map(s => s.views);
                    const leadsData = data.dailyStats.map(s => s.leads);

                    if (window.analyticsChartInstance) {
                        window.analyticsChartInstance.destroy();
                    }

                    const ctx = chartCanvas.getContext('2d');
                    window.analyticsChartInstance = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [
                                {
                                    label: 'Page Views',
                                    data: viewsData,
                                    borderColor: '#3b82f6',
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    borderWidth: 3,
                                    fill: true,
                                    tension: 0.3,
                                    yAxisID: 'y'
                                },
                                {
                                    label: 'Leads Captured',
                                    data: leadsData,
                                    borderColor: '#10b981',
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    borderWidth: 3,
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
                                        color: '#f3f4f6',
                                        font: {
                                            family: "'Inter', sans-serif",
                                            size: 12
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    grid: {
                                        color: 'rgba(255, 255, 255, 0.05)'
                                    },
                                    ticks: {
                                        color: '#9ca3af',
                                        maxTicksLimit: 10
                                    }
                                },
                                y: {
                                    type: 'linear',
                                    display: true,
                                    position: 'left',
                                    grid: {
                                        color: 'rgba(255, 255, 255, 0.05)'
                                    },
                                    ticks: {
                                        color: '#9ca3af',
                                        stepSize: 1
                                    },
                                    title: {
                                        display: true,
                                        text: 'Page Views',
                                        color: '#3b82f6'
                                    }
                                },
                                y1: {
                                    type: 'linear',
                                    display: true,
                                    position: 'right',
                                    grid: {
                                        drawOnChartArea: false
                                    },
                                    ticks: {
                                        color: '#9ca3af',
                                        stepSize: 1
                                    },
                                    title: {
                                        display: true,
                                        text: 'Leads Captured',
                                        color: '#10b981'
                                    }
                                }
                            }
                        }
                    });
                }
                initializeWidgetBuilder(data);

                // Populate CRM & Webhook settings
                const webhookUrlInput = document.getElementById('webhook-url-input');
                const webhookEnabledCheckbox = document.getElementById('webhook-enabled-checkbox');
                const gaTrackingIdInput = document.getElementById('ga-tracking-id-input');
                const fbPixelIdInput = document.getElementById('fb-pixel-id-input');

                if (webhookUrlInput) webhookUrlInput.value = data.webhookUrl || '';
                if (webhookEnabledCheckbox) webhookEnabledCheckbox.checked = !!data.webhookEnabled;
                if (gaTrackingIdInput) gaTrackingIdInput.value = data.gaTrackingId || '';
                if (fbPixelIdInput) fbPixelIdInput.value = data.fbPixelId || '';

                const smsPhoneInput = document.getElementById('sms-phone-input');
                const smsEnabledCheckbox = document.getElementById('sms-enabled-checkbox');
                if (smsPhoneInput) smsPhoneInput.value = data.smsPhone || '';
                if (smsEnabledCheckbox) smsEnabledCheckbox.checked = !!data.smsEnabled;

                // Populate review links
                const googleReviewLinkInput = document.getElementById('google-review-link-input');
                const facebookReviewLinkInput = document.getElementById('facebook-review-link-input');
                const yelpReviewLinkInput = document.getElementById('yelp-review-link-input');
                if (googleReviewLinkInput) googleReviewLinkInput.value = data.googleReviewLink || '';
                if (facebookReviewLinkInput) facebookReviewLinkInput.value = data.facebookReviewLink || '';
                if (yelpReviewLinkInput) yelpReviewLinkInput.value = data.yelpReviewLink || '';

                // Populate review link
                if (reviewLinkInput && data.clientId) {
                    reviewLinkInput.value = `${window.location.origin}/review.html?client=${data.clientId}`;
                }

                currentDashboardData = data;
                updateActivationChecklist(data);

                // Fetch testimonials
                await fetchTestimonials();
            } else if (response.status === 401) {
                window.location.href = '/auth.html';
            } else {
                console.error('Error fetching dashboard data:', response.statusText);
                alert('Failed to load dashboard data.');
            }
        } catch (error) {
            console.error('Fetch error for dashboard data:', error);
            alert('An unexpected error occurred while loading dashboard data.');
        }
    }

    async function fetchTestimonials() {
        const testimonialsBody = document.querySelector('#testimonials-card tbody');
        if (!testimonialsBody) return;

        try {
            const response = await fetch('/api/testimonials', {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                testimonialsBody.innerHTML = '';

                if (data.testimonials && data.testimonials.length > 0) {
                    data.testimonials.forEach(t => {
                        const row = testimonialsBody.insertRow();
                        const ratingStars = '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating);
                        const formattedDate = t.review_date ? new Date(t.review_date).toLocaleDateString() : 'N/A';

                        row.innerHTML = `
                            <td style="font-weight: 600; color: #fff;">${t.author_name}</td>
                            <td style="color: #fbbf24; font-size: 1.1rem;">${ratingStars}</td>
                            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.review_text}">${t.review_text}</td>
                            <td>${formattedDate}</td>
                            <td>
                                <button class="button button-small button-danger delete-testimonial-btn" data-id="${t.id}">Delete</button>
                            </td>
                        `;
                    });
                } else {
                    testimonialsBody.innerHTML = '<tr><td colspan="5">No reviews collected yet. Share your link above to get started!</td></tr>';
                }
            } else {
                console.error('Failed to fetch testimonials:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching testimonials:', error);
        }
    }

    // Event delegation for Edit, Delete, and Indexing Check buttons
    generatedPagesTableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('edit-page-btn')) {
            const pageId = event.target.getAttribute('data-id');
            const page = userPages.find(p => p.pageId === pageId);
            if (page) {
                document.getElementById('edit-page-id').value = page.pageId;
                document.getElementById('edit-business-name').value = page.businessName || '';
                document.getElementById('edit-service').value = page.service || '';
                document.getElementById('edit-town').value = page.town || '';
                document.getElementById('edit-zipcode').value = page.zipCode || '';
                document.getElementById('edit-telephone').value = page.telephone || '';
                document.getElementById('edit-pricerange').value = page.priceRange || '';
                document.getElementById('edit-openinghours').value = page.openingHours || '';
                
                const enableAICopyCheckbox = document.getElementById('edit-enable-ai-copy');
                const aiStyleGroup = document.getElementById('edit-ai-style-group');
                if (enableAICopyCheckbox) {
                    enableAICopyCheckbox.checked = !!page.enableAICopy;
                }
                if (aiStyleGroup) {
                    aiStyleGroup.style.display = page.enableAICopy ? 'block' : 'none';
                }
                const aiStyleInput = document.getElementById('edit-ai-style');
                if (aiStyleInput) {
                    aiStyleInput.value = page.aiStyle || 'professional';
                }
                const aiKeywordsInput = document.getElementById('edit-ai-keywords');
                if (aiKeywordsInput) {
                    aiKeywordsInput.value = page.aiKeywords || '';
                }
                
                editModal.style.display = 'flex';
            }
        } else if (event.target.classList.contains('visual-edit-page-btn') || event.target.closest('.visual-edit-page-btn')) {
            const btn = event.target.classList.contains('visual-edit-page-btn') ? event.target : event.target.closest('.visual-edit-page-btn');
            const pageId = btn.getAttribute('data-id');
            openVisualEditor(pageId);
        } else if (event.target.classList.contains('delete-page-btn')) {
            const pageId = event.target.getAttribute('data-id');
            document.getElementById('delete-page-id').value = pageId;
            deleteModal.style.display = 'flex';
        } else {
            const checkBtn = event.target.closest('.check-indexing-btn');
            if (checkBtn) {
                const pageId = checkBtn.getAttribute('data-id');
                const icon = checkBtn.querySelector('i');
                
                if (icon.classList.contains('fa-spin')) return; // already loading
                
                icon.classList.add('fa-spin');
                checkBtn.disabled = true;
                
                try {
                    const response = await fetch('/api/check-indexing-status', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${jwtToken}`
                        },
                        body: JSON.stringify({ pageId })
                    });
                    
                    if (response.ok) {
                        const resData = await response.json();
                        
                        const page = userPages.find(p => p.pageId === pageId);
                        if (page) {
                            page.indexingStatus = resData.indexingStatus;
                            page.lastIndexingCheck = resData.lastIndexingCheck;
                        }
                        
                        renderFilteredPages();
                    } else {
                        const errData = await response.json();
                        alert(`Error checking indexing status: ${errData.message || 'Failed request.'}`);
                        icon.classList.remove('fa-spin');
                        checkBtn.disabled = false;
                    }
                } catch (error) {
                    console.error('Error checking indexing status:', error);
                    alert('An unexpected error occurred while checking indexing status.');
                    icon.classList.remove('fa-spin');
                    checkBtn.disabled = false;
                }
            }
        }
    });

    // Close Modals
    const closeEditModal = document.getElementById('close-edit-modal');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    if (closeEditModal) {
        closeEditModal.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
    }
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
    }
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            deleteModal.style.display = 'none';
        });
    }

    // Submit Edit Form
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pageId = document.getElementById('edit-page-id').value;
            const businessName = document.getElementById('edit-business-name').value;
            const service = document.getElementById('edit-service').value;
            const town = document.getElementById('edit-town').value;
            const zipCode = document.getElementById('edit-zipcode').value;
            const telephone = document.getElementById('edit-telephone').value;
            const priceRange = document.getElementById('edit-pricerange').value;
            const openingHours = document.getElementById('edit-openinghours').value;
            const enableAICopy = document.getElementById('edit-enable-ai-copy') ? document.getElementById('edit-enable-ai-copy').checked : false;
            const aiStyle = document.getElementById('edit-ai-style') ? document.getElementById('edit-ai-style').value : 'professional';
            const aiKeywords = document.getElementById('edit-ai-keywords') ? document.getElementById('edit-ai-keywords').value : '';

            try {
                const response = await fetch('/api/update-page', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify({
                        pageId,
                        businessName,
                        service,
                        town,
                        zipCode,
                        telephone,
                        priceRange,
                        openingHours,
                        enableAICopy,
                        aiStyle,
                        aiKeywords
                    })
                });

                if (response.ok) {
                    editModal.style.display = 'none';
                    await fetchDashboardData();
                } else {
                    const data = await response.json();
                    alert(`Error: ${data.message}`);
                }
            } catch (error) {
                console.error('Error updating page:', error);
                alert('Failed to update page.');
            }
        });
    }

    // Confirm Delete
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            const pageId = document.getElementById('delete-page-id').value;

            try {
                const response = await fetch('/api/delete-page', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify({ pageId })
                });

                if (response.ok) {
                    deleteModal.style.display = 'none';
                    await fetchDashboardData();
                } else {
                    const data = await response.json();
                    alert(`Error: ${data.message}`);
                }
            } catch (error) {
                console.error('Error deleting page:', error);
                alert('Failed to delete page.');
            }
        });
    }

    // WordPress plugin download trigger
    const downloadWpPluginBtn = document.getElementById('download-wp-plugin-btn');
    if (downloadWpPluginBtn) {
        downloadWpPluginBtn.addEventListener('click', () => {
            downloadWpPluginBtn.disabled = true;
            const originalText = downloadWpPluginBtn.innerHTML;
            downloadWpPluginBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 6px;"></i> Preparing...';
            
            window.location.href = '/api/download-wp-plugin';
            
            localStorage.setItem('localleads_integrated', 'true');
            if (currentDashboardData) {
                updateActivationChecklist(currentDashboardData);
            }
            
            setTimeout(() => {
                downloadWpPluginBtn.disabled = false;
                downloadWpPluginBtn.innerHTML = originalText;
            }, 3000);
        });
    }

    // Custom domain configuration submit handler
    const customDomainForm = document.getElementById('custom-domain-form');
    const customDomainSuccessMsg = document.getElementById('custom-domain-success-msg');
    const customDomainErrorMsg = document.getElementById('custom-domain-error-msg');

    if (customDomainForm) {
        customDomainForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (customDomainSuccessMsg) customDomainSuccessMsg.style.display = 'none';
            if (customDomainErrorMsg) customDomainErrorMsg.style.display = 'none';

            const customDomain = document.getElementById('custom-domain-input').value;
            const customDomainRedirect = document.getElementById('custom-domain-redirect-input').value;

            try {
                const response = await fetch('/api/update-custom-domain', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify({ customDomain, customDomainRedirect })
                });

                const resData = await response.json();
                if (response.ok) {
                    if (customDomainSuccessMsg) {
                        customDomainSuccessMsg.textContent = resData.message;
                        customDomainSuccessMsg.style.display = 'block';
                    }
                    await fetchDashboardData();
                } else {
                    if (customDomainErrorMsg) {
                        customDomainErrorMsg.textContent = resData.message || 'Failed to update settings.';
                        customDomainErrorMsg.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Error updating custom domain:', error);
                if (customDomainErrorMsg) {
                    customDomainErrorMsg.textContent = 'An unexpected error occurred.';
                    customDomainErrorMsg.style.display = 'block';
                }
            }
        });
    }

    const verifyDnsBtn = document.getElementById('verify-dns-btn');
    if (verifyDnsBtn) {
        verifyDnsBtn.addEventListener('click', async () => {
            if (customDomainSuccessMsg) customDomainSuccessMsg.style.display = 'none';
            if (customDomainErrorMsg) customDomainErrorMsg.style.display = 'none';

            const customDomain = document.getElementById('custom-domain-input').value;
            if (!customDomain || !customDomain.trim()) {
                if (customDomainErrorMsg) {
                    customDomainErrorMsg.textContent = 'Please enter a custom domain name first.';
                    customDomainErrorMsg.style.display = 'block';
                }
                return;
            }

            const originalBtnText = verifyDnsBtn.textContent;
            verifyDnsBtn.textContent = 'Verifying...';
            verifyDnsBtn.disabled = true;

            try {
                const response = await fetch('/api/verify-dns', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify({ domain: customDomain })
                });

                const resData = await response.json();
                if (response.ok && resData.verified) {
                    if (customDomainSuccessMsg) {
                        customDomainSuccessMsg.textContent = resData.message;
                        customDomainSuccessMsg.style.display = 'block';
                    }
                } else {
                    if (customDomainErrorMsg) {
                        customDomainErrorMsg.textContent = resData.message || 'DNS verification failed.';
                        customDomainErrorMsg.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Error verifying DNS:', error);
                if (customDomainErrorMsg) {
                    customDomainErrorMsg.textContent = 'An error occurred during DNS verification.';
                    customDomainErrorMsg.style.display = 'block';
                }
            } finally {
                verifyDnsBtn.textContent = originalBtnText;
                verifyDnsBtn.disabled = false;
            }
        });
    }

    // Premium Upgrade modal controls
    const upgradeModal = document.getElementById('upgrade-required-modal');
    const closeUpgradeModal = document.getElementById('close-upgrade-modal');
    const closeUpgradeBtn = document.getElementById('close-upgrade-btn');

    if (closeUpgradeModal) {
        closeUpgradeModal.addEventListener('click', () => {
            upgradeModal.style.display = 'none';
        });
    }
    if (closeUpgradeBtn) {
        closeUpgradeBtn.addEventListener('click', () => {
            upgradeModal.style.display = 'none';
        });
    }

    // Billing Portal Click Handler
    const billingPortalLink = document.getElementById('billing-portal-link');
    if (billingPortalLink) {
        billingPortalLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const originalText = billingPortalLink.innerHTML;
            billingPortalLink.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opening Portal...';
            billingPortalLink.style.pointerEvents = 'none';

            try {
                const response = await fetch('/api/create-portal-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    }
                });

                const data = await response.json();
                if (response.ok && data.url) {
                    window.location.href = data.url;
                } else {
                    alert(data.message || 'Failed to open billing portal. Please purchase credits or a subscription first.');
                    billingPortalLink.innerHTML = originalText;
                    billingPortalLink.style.pointerEvents = 'auto';
                }
            } catch (error) {
                console.error('Error opening billing portal:', error);
                alert('An unexpected error occurred. Please try again.');
                billingPortalLink.innerHTML = originalText;
                billingPortalLink.style.pointerEvents = 'auto';
            }
        });
    }

    // Export Leads Click Handler
    const exportLeadsBtn = document.getElementById('export-leads-btn');
    if (exportLeadsBtn) {
        exportLeadsBtn.addEventListener('click', async () => {
            exportLeadsBtn.disabled = true;
            const originalText = exportLeadsBtn.innerHTML;
            exportLeadsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';

            try {
                const response = await fetch('/api/export-leads', {
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`
                    }
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'localleads-captured-leads.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                } else if (response.status === 403) {
                    if (upgradeModal) {
                        upgradeModal.style.display = 'flex';
                    } else {
                        alert('Lead export is a premium feature. Please upgrade to a paid pack.');
                    }
                } else {
                    const data = await response.json();
                    alert(`Error: ${data.message || 'Failed to export leads.'}`);
                }
            } catch (error) {
                console.error('Error exporting leads:', error);
                alert('An unexpected error occurred while exporting leads.');
            } finally {
                exportLeadsBtn.disabled = false;
                exportLeadsBtn.innerHTML = originalText;
            }
        });
    }

    // Export Pages Click Handler
    const exportPagesBtn = document.getElementById('export-pages-btn');
    if (exportPagesBtn) {
        exportPagesBtn.addEventListener('click', async () => {
            exportPagesBtn.disabled = true;
            const originalText = exportPagesBtn.innerHTML;
            exportPagesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';

            try {
                const response = await fetch('/api/export-pages', {
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`
                    }
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'localleads-generated-pages.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                } else {
                    const data = await response.json();
                    alert(`Error: ${data.message || 'Failed to export pages.'}`);
                }
            } catch (error) {
                console.error('Error exporting pages:', error);
                alert('An unexpected error occurred while exporting pages.');
            } finally {
                exportPagesBtn.disabled = false;
                exportPagesBtn.innerHTML = originalText;
            }
        });
    }

    // Close modals on outside click
    window.addEventListener('click', (event) => {
        if (event.target === upgradeModal) {
            upgradeModal.style.display = 'none';
        }
    });

    function populateTagFilters() {
        const serviceTagsContainer = document.getElementById('service-tags');
        const townTagsContainer = document.getElementById('town-tags');
        
        if (!serviceTagsContainer || !townTagsContainer) return;
        
        serviceTagsContainer.innerHTML = '';
        townTagsContainer.innerHTML = '';
        
        // Extract unique services and towns
        const services = [...new Set(userPages.map(p => p.service).filter(Boolean))].sort();
        const towns = [...new Set(userPages.map(p => p.town).filter(Boolean))].sort();
        
        if (services.length === 0) {
            serviceTagsContainer.innerHTML = '<span style="color: #6b7280; font-size: 0.85rem; font-style: italic;">None</span>';
        } else {
            services.forEach(service => {
                const tag = document.createElement('span');
                tag.className = `filter-tag filter-tag-service ${activeServiceFilters.has(service) ? 'active' : ''}`;
                tag.textContent = service;
                tag.addEventListener('click', () => {
                    if (activeServiceFilters.has(service)) {
                        activeServiceFilters.delete(service);
                        tag.classList.remove('active');
                    } else {
                        activeServiceFilters.add(service);
                        tag.classList.add('active');
                    }
                    renderFilteredPages();
                });
                serviceTagsContainer.appendChild(tag);
            });
        }
        
        if (towns.length === 0) {
            townTagsContainer.innerHTML = '<span style="color: #6b7280; font-size: 0.85rem; font-style: italic;">None</span>';
        } else {
            towns.forEach(town => {
                const tag = document.createElement('span');
                tag.className = `filter-tag filter-tag-town ${activeTownFilters.has(town) ? 'active' : ''}`;
                tag.textContent = town;
                tag.addEventListener('click', () => {
                    if (activeTownFilters.has(town)) {
                        activeTownFilters.delete(town);
                        tag.classList.remove('active');
                    } else {
                        activeTownFilters.add(town);
                        tag.classList.add('active');
                    }
                    renderFilteredPages();
                });
                townTagsContainer.appendChild(tag);
            });
        }
    }

    function renderFilteredPages() {
        if (!generatedPagesTableBody) return;
        
        generatedPagesTableBody.innerHTML = '';
        
        if (userPages.length === 0) {
            generatedPagesTableBody.innerHTML = '<tr><td colspan="6">No pages generated yet.</td></tr>';
            const activeFiltersInfo = document.getElementById('active-filters-info');
            if (activeFiltersInfo) activeFiltersInfo.style.display = 'none';
            return;
        }
        
        // Filter pages
        const filtered = userPages.filter(page => {
            // Search query match
            const queryLower = searchQuery.toLowerCase().trim();
            const matchesSearch = !queryLower || 
                (page.businessName && page.businessName.toLowerCase().includes(queryLower)) ||
                (page.service && page.service.toLowerCase().includes(queryLower)) ||
                (page.town && page.town.toLowerCase().includes(queryLower)) ||
                (page.zipCode && page.zipCode.toLowerCase().includes(queryLower));
                
            // Service tag match (OR match among selected service tags, or true if none selected)
            const matchesService = activeServiceFilters.size === 0 || activeServiceFilters.has(page.service);
            
            // Town tag match (OR match among selected town tags, or true if none selected)
            const matchesTown = activeTownFilters.size === 0 || activeTownFilters.has(page.town);
            
            return matchesSearch && matchesService && matchesTown;
        });
        
        // Populate filtered pages table
        if (filtered.length > 0) {
            filtered.forEach(page => {
                const row = generatedPagesTableBody.insertRow();
                
                const getIndexingBadge = (status) => {
                    const statusLower = (status || '').toLowerCase();
                    if (statusLower.includes('indexed') || statusLower === 'pass' || statusLower === 'indexed, primary') {
                        return `<span class="badge badge-indexed" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-check-circle"></i> Indexed</span>`;
                    }
                    if (statusLower.includes('crawled') || statusLower === 'neutral') {
                        return `<span class="badge badge-crawled" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-history"></i> Crawled</span>`;
                    }
                    if (statusLower.includes('excluded') || statusLower.includes('noindex') || statusLower === 'fail') {
                        return `<span class="badge badge-excluded" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-times-circle"></i> Excluded</span>`;
                    }
                    return `<span class="badge badge-unknown" style="background: rgba(156, 163, 175, 0.15); color: #9ca3af; border: 1px solid rgba(156, 163, 175, 0.3); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-question-circle"></i> Unknown</span>`;
                };

                row.innerHTML = `
                    <td>${page.businessName}</td>
                    <td>${page.service}</td>
                    <td>${page.town}</td>
                    <td>${page.views || 0}</td>
                    <td>${page.uniqueVisitors || 0}</td>
                    <td>
                        <div style="display: inline-flex; align-items: center; flex-wrap: nowrap;">
                            ${getIndexingBadge(page.indexingStatus)}
                            <button class="check-indexing-btn" data-id="${page.pageId}" title="Check actual Google indexing status" style="background: none; border: none; color: #60a5fa; cursor: pointer; padding: 4px 6px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s; margin-left: 6px;">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                        ${page.lastIndexingCheck ? `<div style="font-size: 0.7rem; color: #6b7280; margin-top: 4px; white-space: nowrap;">Checked: ${new Date(page.lastIndexingCheck).toLocaleDateString()}</div>` : ''}
                    </td>
                    <td>
                        <a href="${page.url}" target="_blank" class="button button-small">View</a>
                        <button class="button button-small button-secondary edit-page-btn" data-id="${page.pageId}">Edit</button>
                        <button class="button button-small button-secondary visual-edit-page-btn" data-id="${page.pageId}" style="display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-paint-brush"></i> Visual Edit</button>
                        <button class="button button-small button-danger delete-page-btn" data-id="${page.pageId}">Delete</button>
                    </td>
                `;
            });
        } else {
            generatedPagesTableBody.innerHTML = '<tr><td colspan="7">No matching pages found. Try adjusting your filters.</td></tr>';
        }
        
        // Update active filter info bar
        const activeFiltersInfo = document.getElementById('active-filters-info');
        const filteredPagesCount = document.getElementById('filtered-pages-count');
        
        if (activeFiltersInfo && filteredPagesCount) {
            const hasFilters = searchQuery || activeServiceFilters.size > 0 || activeTownFilters.size > 0;
            if (hasFilters) {
                activeFiltersInfo.style.display = 'flex';
                filteredPagesCount.textContent = `Found ${filtered.length} of ${userPages.length} pages`;
            } else {
                activeFiltersInfo.style.display = 'none';
            }
        }
    }

    // Bind Search & Filter Event Listeners
    const pageSearchInput = document.getElementById('page-search-input');
    if (pageSearchInput) {
        pageSearchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderFilteredPages();
        });
    }

    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            const pageSearchInput = document.getElementById('page-search-input');
            if (pageSearchInput) {
                pageSearchInput.value = '';
            }
            searchQuery = '';
            activeServiceFilters.clear();
            activeTownFilters.clear();
            
            // Re-render tags to clear active class
            populateTagFilters();
            renderFilteredPages();
        });
    }

    // Initial load
    fetchDashboardData();

    // Onboarding message logic
    if (onboardingMessage && dismissOnboardingButton) {
        const onboardingDismissed = localStorage.getItem('dashboard-onboarding-dismissed');
        if (!onboardingDismissed) {
            onboardingMessage.style.display = 'block';
        }

        dismissOnboardingButton.addEventListener('click', () => {
            onboardingMessage.style.display = 'none';
            localStorage.setItem('dashboard-onboarding-dismissed', 'true');
        });
    }

    function initializeWidgetBuilder(data) {
        const layoutSelect = document.getElementById('widget-layout-select');
        const themeSelect = document.getElementById('widget-theme-select');
        const colorInput = document.getElementById('widget-color-input');
        const colorText = document.getElementById('widget-color-text');
        const embedCodeTextarea = document.getElementById('widget-embed-code');
        const copyBtn = document.getElementById('copy-widget-code-btn');
        const previewBox = document.getElementById('widget-preview-box');

        const cssInput = document.getElementById('widget-css-input');
        const saveCssBtn = document.getElementById('save-widget-css-btn');
        const cssSuccessMsg = document.getElementById('widget-css-success-msg');
        const cssErrorMsg = document.getElementById('widget-css-error-msg');
        const configForm = document.getElementById('widget-config-form');

        if (!layoutSelect || !themeSelect || !colorInput || !colorText || !embedCodeTextarea || !previewBox) {
            return;
        }

        const clientId = data.clientId;
        const pages = data.generatedPages || [];

        // Load custom CSS if exists
        if (cssInput && data.widgetCss) {
            cssInput.value = data.widgetCss;
        }

        // Keep color input and text in sync
        colorInput.addEventListener('input', (e) => {
            colorText.value = e.target.value.toUpperCase();
            updateEmbedCodeAndPreview();
        });

        colorText.addEventListener('input', (e) => {
            let val = e.target.value.trim();
            if (val && !val.startsWith('#')) {
                val = '#' + val;
            }
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                colorInput.value = val;
                updateEmbedCodeAndPreview();
            }
        });

        layoutSelect.addEventListener('change', updateEmbedCodeAndPreview);
        themeSelect.addEventListener('change', updateEmbedCodeAndPreview);
        
        if (cssInput) {
            cssInput.addEventListener('input', updateCssPreview);
        }

        // Form submit handler to save Custom CSS
        if (configForm) {
            configForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!cssInput) return;

                if (saveCssBtn) {
                    saveCssBtn.disabled = true;
                    saveCssBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 4px;"></i> Saving...';
                }
                if (cssSuccessMsg) cssSuccessMsg.style.display = 'none';
                if (cssErrorMsg) cssErrorMsg.style.display = 'none';

                try {
                    const response = await fetch('/api/update-widget-css', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ widgetCss: cssInput.value })
                    });

                    const result = await response.json();

                    if (response.ok) {
                        if (cssSuccessMsg) {
                            cssSuccessMsg.textContent = result.message || 'Styles saved successfully!';
                            cssSuccessMsg.style.display = 'block';
                        }
                        data.widgetCss = cssInput.value;
                        if (currentDashboardData) {
                            currentDashboardData.widgetCss = cssInput.value;
                            updateActivationChecklist(currentDashboardData);
                        }
                    } else {
                        if (cssErrorMsg) {
                            cssErrorMsg.textContent = result.message || 'Failed to save styles.';
                            cssErrorMsg.style.display = 'block';
                        }
                    }
                } catch (error) {
                    console.error('Error saving widget CSS:', error);
                    if (cssErrorMsg) {
                        cssErrorMsg.textContent = 'A network error occurred. Please try again.';
                        cssErrorMsg.style.display = 'block';
                    }
                } finally {
                    if (saveCssBtn) {
                        saveCssBtn.disabled = false;
                        saveCssBtn.innerHTML = '<i class="fas fa-save" style="margin-right: 4px;"></i> Save Styles';
                    }
                }
            });
        }

        function updateCssPreview() {
            if (!cssInput) return;
            let style = document.getElementById('widget-preview-custom-css');
            if (!style) {
                style = document.createElement('style');
                style.id = 'widget-preview-custom-css';
                document.head.appendChild(style);
            }
            style.textContent = cssInput.value;
        }

        function updateBaseCssPreview(theme, layout, baseColor) {
            let style = document.getElementById('widget-preview-base-styles');
            if (!style) {
                style = document.createElement('style');
                style.id = 'widget-preview-base-styles';
                document.head.appendChild(style);
            }

            style.textContent = `
                .ll-widget-container-${clientId} {
                    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    box-sizing: border-box;
                    margin: 1rem 0;
                    width: 100%;
                }
                .ll-widget-container-${clientId} * {
                    box-sizing: border-box;
                }
                .ll-widget-title-${clientId} {
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .ll-widget-grid-${clientId} {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                    gap: 10px;
                    width: 100%;
                }
                .ll-widget-card-${clientId} {
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
                .ll-widget-card-${clientId}:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .ll-widget-card-town-${clientId} {
                    font-weight: 700;
                    font-size: 0.85rem;
                    margin-bottom: 4px;
                }
                .ll-widget-card-service-${clientId} {
                    font-size: 0.75rem;
                    opacity: 0.8;
                }
                .ll-widget-list-${clientId} {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    width: 100%;
                }
                .ll-widget-list-item-${clientId} a {
                    display: inline-block;
                    padding: 5px 10px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    text-decoration: none;
                    font-weight: 500;
                    transition: background 0.2s ease, transform 0.1s ease;
                    border: 1px solid rgba(128,128,128,0.2);
                }
                .ll-widget-list-item-${clientId} a:hover {
                    transform: scale(1.02);
                }

                /* Light Theme */
                .ll-theme-light-${clientId} .ll-widget-card-${clientId} {
                    background: #ffffff;
                    color: #1f2937;
                }
                .ll-theme-light-${clientId} .ll-widget-card-${clientId}:hover {
                    border-color: ${baseColor};
                }
                .ll-theme-light-${clientId} .ll-widget-card-town-${clientId} {
                    color: #111827;
                }
                .ll-theme-light-${clientId} .ll-widget-list-item-${clientId} a {
                    background: #f3f4f6;
                    color: #374151;
                }
                .ll-theme-light-${clientId} .ll-widget-list-item-${clientId} a:hover {
                    background: ${baseColor};
                    color: #ffffff;
                    border-color: ${baseColor};
                }
                .ll-theme-light-${clientId} .ll-widget-title-${clientId} {
                    color: #111827;
                }

                /* Dark Theme */
                .ll-theme-dark-${clientId} .ll-widget-card-${clientId} {
                    background: #1f2937;
                    color: #f3f4f6;
                    border-color: #374151;
                }
                .ll-theme-dark-${clientId} .ll-widget-card-${clientId}:hover {
                    border-color: ${baseColor};
                }
                .ll-theme-dark-${clientId} .ll-widget-card-town-${clientId} {
                    color: #ffffff;
                }
                .ll-theme-dark-${clientId} .ll-widget-list-item-${clientId} a {
                    background: #374151;
                    color: #f3f4f6;
                    border-color: #4b5563;
                }
                .ll-theme-dark-${clientId} .ll-widget-list-item-${clientId} a:hover {
                    background: ${baseColor};
                    color: #ffffff;
                    border-color: ${baseColor};
                }
                .ll-theme-dark-${clientId} .ll-widget-title-${clientId} {
                    color: #ffffff;
                }

                /* Glassmorphic Theme */
                .ll-theme-glassmorphic-${clientId} .ll-widget-card-${clientId} {
                    background: rgba(255, 255, 255, 0.05);
                    color: #f3f4f6;
                    border-color: rgba(255, 255, 255, 0.1);
                }
                .ll-theme-glassmorphic-${clientId} .ll-widget-card-${clientId}:hover {
                    border-color: ${baseColor};
                    background: rgba(255, 255, 255, 0.08);
                }
                .ll-theme-glassmorphic-${clientId} .ll-widget-list-item-${clientId} a {
                    background: rgba(255, 255, 255, 0.05);
                    color: #f3f4f6;
                    border-color: rgba(255, 255, 255, 0.1);
                }
                .ll-theme-glassmorphic-${clientId} .ll-widget-list-item-${clientId} a:hover {
                    background: ${baseColor};
                    color: #ffffff;
                    border-color: ${baseColor};
                }

                /* Badge Specifics */
                .ll-badge-trigger-${clientId} {
                    background: ${baseColor};
                    color: #ffffff;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 0.8rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                    cursor: pointer;
                }
                .ll-badge-modal-${clientId} {
                    border-radius: 8px;
                    border: 1px solid rgba(128,128,128,0.2);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                }
                .ll-badge-modal-close-${clientId} {
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 1rem;
                    opacity: 0.7;
                }
                .ll-badge-modal-close-${clientId}:hover {
                    opacity: 1;
                }
            `;
        }

        function updateEmbedCodeAndPreview() {
            const layout = layoutSelect.value;
            const theme = themeSelect.value;
            const color = colorInput.value.replace('#', '');
            const origin = window.location.origin;

            const scriptUrl = `${origin}/api/widget?clientId=${clientId}&theme=${theme}&layout=${layout}&color=${color}`;
            
            let embedCode = '';
            if (layout === 'badge') {
                embedCode = `<!-- LocalLeads Service Area Widget Embed -->\n<script src="${scriptUrl}"></script>`;
            } else {
                embedCode = `<!-- LocalLeads Service Area Widget Embed -->\n<div id="localseo-widget"></div>\n<script src="${scriptUrl}"></script>`;
            }
            embedCodeTextarea.value = embedCode;

            // Update style blocks
            updateBaseCssPreview(theme, layout, colorInput.value);
            updateCssPreview();

            // Render live preview
            renderPreview(pages, theme, layout, colorInput.value);
        }

        function renderPreview(pagesList, theme, layout, baseColor) {
            previewBox.innerHTML = '';
            
            if (theme === 'light') {
                previewBox.style.background = '#ffffff';
                previewBox.style.color = '#1f2937';
            } else if (theme === 'dark') {
                previewBox.style.background = '#1f2937';
                previewBox.style.color = '#f3f4f6';
            } else { // glassmorphic
                previewBox.style.background = 'rgba(31, 41, 55, 0.4)';
                previewBox.style.backdropFilter = 'blur(10px)';
                previewBox.style.color = '#f3f4f6';
            }

            if (pagesList.length === 0) {
                previewBox.innerHTML = '<p style="font-size: 0.85rem; color: #9ca3af; margin: 0; text-align: center;">Generate pages first to preview the widget.</p>';
                return;
            }

            if (layout === 'badge') {
                previewBox.innerHTML = `
                    <div class="ll-widget-container-${clientId}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 10px; width: 100%; font-family: sans-serif;">
                        <div class="ll-badge-trigger-${clientId}" id="preview-badge-trigger">
                            📍 Serving ${pagesList.length} Areas
                        </div>
                        <p style="font-size: 0.75rem; color: #9ca3af; margin: 0; text-align: center;">Click the badge to preview the service area list.</p>
                        
                        <div id="preview-badge-modal" class="ll-badge-modal-${clientId}" style="display: none; flex-direction: column; width: 90%; max-height: 180px; background: ${theme === 'light' ? '#fff' : '#111827'}; color: ${theme === 'light' ? '#374151' : '#f3f4f6'}; text-align: left;">
                            <div class="ll-badge-modal-header-${clientId}" style="padding: 8px; border-bottom: 1px solid rgba(128,128,128,0.2); display: flex; justify-content: space-between; font-weight: bold; align-items: center;">
                                <span>Our Service Areas</span>
                                <span id="preview-close-modal" class="ll-badge-modal-close-${clientId}">&times;</span>
                            </div>
                            <div class="ll-badge-modal-body-${clientId}" style="padding: 8px; overflow-y: auto; flex: 1;">
                                <ul style="list-style: none; padding: 0; margin: 0;">
                                    ${pagesList.slice(0, 3).map(p => `<li style="margin-bottom: 4px;"><a href="#" onclick="return false;" style="display: block; padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(128,128,128,0.15); text-decoration: none; color: inherit; font-size: 0.75rem; background: rgba(128,128,128,0.05); font-weight: 500;">${p.service} in ${p.town}</a></li>`).join('')}
                                    ${pagesList.length > 3 ? `<li style="font-size: 0.7rem; color: #9ca3af; padding-left: 8px;">+ ${pagesList.length - 3} more areas...</li>` : ''}
                                </ul>
                            </div>
                        </div>
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
                let gridItems = pagesList.slice(0, 4).map(p => `
                    <div class="ll-widget-card-${clientId}">
                        <div class="ll-widget-card-town-${clientId}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.town}</div>
                        <div class="ll-widget-card-service-${clientId}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.service}</div>
                    </div>
                `).join('');
                
                if (pagesList.length > 4) {
                    gridItems += `
                        <div style="border: 1px dashed rgba(128,128,128,0.3); border-radius: 6px; padding: 8px; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; color: #9ca3af;">
                            + ${pagesList.length - 4} more
                        </div>
                    `;
                }

                previewBox.innerHTML = `
                    <div class="ll-widget-container-${clientId} ll-theme-${theme}-${clientId}" style="width: 100%; text-align: left; display: flex; flex-direction: column; height: 100%; font-family: sans-serif;">
                        <div class="ll-widget-title-${clientId}">📍 Areas We Serve</div>
                        <div class="ll-widget-grid-${clientId}">
                            ${gridItems}
                        </div>
                    </div>
                `;
            } else {
                let listItems = pagesList.slice(0, 5).map(p => `
                    <li class="ll-widget-list-item-${clientId}" style="display: inline-block;">
                        <a href="#" onclick="return false;">${p.service} in ${p.town}</a>
                    </li>
                `).join('');

                if (pagesList.length > 5) {
                    listItems += `<li style="font-size: 0.7rem; color: #9ca3af; padding: 4px 8px; display: inline-block;">+ dots</li>`;
                }

                previewBox.innerHTML = `
                    <div class="ll-widget-container-${clientId} ll-theme-${theme}-${clientId}" style="width: 100%; text-align: left; display: flex; flex-direction: column; height: 100%; font-family: sans-serif;">
                        <div class="ll-widget-title-${clientId}">📍 Areas We Serve</div>
                        <ul class="ll-widget-list-${clientId}">
                            ${listItems}
                        </ul>
                    </div>
                `;
            }
        }

        // Copy Code Button handler
        copyBtn.addEventListener('click', () => {
            embedCodeTextarea.select();
            embedCodeTextarea.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(embedCodeTextarea.value).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                
                localStorage.setItem('localleads_integrated', 'true');
                if (currentDashboardData) {
                    updateActivationChecklist(currentDashboardData);
                }

                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy widget code:', err);
                alert('Failed to copy. Please select and copy manually.');
            });
        });

        // First execution
        updateEmbedCodeAndPreview();
    }

    // CRM & Webhooks Form Submission
    const integrationsForm = document.getElementById('integrations-form');
    const integrationsSuccessMsg = document.getElementById('integrations-success-msg');
    const integrationsErrorMsg = document.getElementById('integrations-error-msg');

    if (integrationsForm) {
        integrationsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (integrationsSuccessMsg) integrationsSuccessMsg.style.display = 'none';
            if (integrationsErrorMsg) integrationsErrorMsg.style.display = 'none';

            const webhookUrl = document.getElementById('webhook-url-input').value;
            const webhookEnabled = document.getElementById('webhook-enabled-checkbox').checked;
            const gaTrackingId = document.getElementById('ga-tracking-id-input').value;
            const fbPixelId = document.getElementById('fb-pixel-id-input').value;
            const smsPhone = document.getElementById('sms-phone-input') ? document.getElementById('sms-phone-input').value : '';
            const smsEnabled = document.getElementById('sms-enabled-checkbox') ? document.getElementById('sms-enabled-checkbox').checked : false;
            const googleReviewLink = document.getElementById('google-review-link-input') ? document.getElementById('google-review-link-input').value : '';
            const facebookReviewLink = document.getElementById('facebook-review-link-input') ? document.getElementById('facebook-review-link-input').value : '';
            const yelpReviewLink = document.getElementById('yelp-review-link-input') ? document.getElementById('yelp-review-link-input').value : '';

            try {
                const response = await fetch('/api/update-integrations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify({ webhookUrl, webhookEnabled, gaTrackingId, fbPixelId, smsEnabled, smsPhone, googleReviewLink, facebookReviewLink, yelpReviewLink })
                });

                const resData = await response.json();
                if (response.ok) {
                    if (integrationsSuccessMsg) {
                        integrationsSuccessMsg.textContent = resData.message;
                        integrationsSuccessMsg.style.display = 'block';
                    }
                    await fetchDashboardData();
                } else {
                    if (integrationsErrorMsg) {
                        integrationsErrorMsg.textContent = resData.message || 'Failed to update integrations.';
                        integrationsErrorMsg.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Error updating integrations:', error);
                if (integrationsErrorMsg) {
                    integrationsErrorMsg.textContent = 'An unexpected error occurred.';
                    integrationsErrorMsg.style.display = 'block';
                }
            }
        });
    }

    // Test Webhook Connection
    const testWebhookBtn = document.getElementById('test-webhook-btn');
    const webhookTestMsg = document.getElementById('webhook-test-msg');

    if (testWebhookBtn) {
        testWebhookBtn.addEventListener('click', async () => {
            if (webhookTestMsg) {
                webhookTestMsg.style.display = 'none';
                webhookTestMsg.style.color = '#fff';
            }

            const webhookUrl = document.getElementById('webhook-url-input').value;
            if (!webhookUrl) {
                if (webhookTestMsg) {
                    webhookTestMsg.textContent = 'Please enter a webhook URL first.';
                    webhookTestMsg.style.color = '#ef4444';
                    webhookTestMsg.style.display = 'block';
                }
                return;
            }

            testWebhookBtn.disabled = true;
            const originalText = testWebhookBtn.textContent;
            testWebhookBtn.textContent = 'Testing Connection...';

            try {
                const response = await fetch('/api/test-webhook', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify({ webhookUrl })
                });

                const resData = await response.json();
                if (webhookTestMsg) {
                    webhookTestMsg.textContent = resData.message;
                    webhookTestMsg.style.color = response.ok ? '#10b981' : '#ef4444';
                    webhookTestMsg.style.display = 'block';
                }
            } catch (error) {
                console.error('Error testing webhook:', error);
                if (webhookTestMsg) {
                    webhookTestMsg.textContent = 'Failed to connect to the test webhook endpoint.';
                    webhookTestMsg.style.color = '#ef4444';
                    webhookTestMsg.style.display = 'block';
                }
            } finally {
                testWebhookBtn.disabled = false;
                testWebhookBtn.textContent = originalText;
            }
        });
    }

    // Copy review link to clipboard
    if (copyReviewLinkBtn && reviewLinkInput) {
        copyReviewLinkBtn.addEventListener('click', () => {
            reviewLinkInput.select();
            reviewLinkInput.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(reviewLinkInput.value);
            const originalText = copyReviewLinkBtn.innerHTML;
            copyReviewLinkBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyReviewLinkBtn.innerHTML = originalText;
            }, 2000);
        });
    }

    // Testimonial Modal Open/Close
    if (addTestimonialBtn && testimonialModal) {
        addTestimonialBtn.addEventListener('click', () => {
            testimonialModal.style.display = 'flex';
        });
    }

    if (closeTestimonialModal) {
        closeTestimonialModal.addEventListener('click', () => {
            testimonialModal.style.display = 'none';
        });
    }

    if (cancelTestimonialBtn) {
        cancelTestimonialBtn.addEventListener('click', () => {
            testimonialModal.style.display = 'none';
        });
    }

    // Add Testimonial Form submit
    if (addTestimonialForm) {
        addTestimonialForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = addTestimonialForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Adding...';

            const authorName = document.getElementById('testimonial-author').value;
            const rating = document.getElementById('testimonial-rating').value;
            const reviewText = document.getElementById('testimonial-text').value;
            const reviewDate = document.getElementById('testimonial-date').value;

            try {
                const response = await fetch('/api/testimonials', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify({
                        authorName,
                        rating,
                        reviewText,
                        reviewDate: reviewDate || undefined
                    })
                });

                if (response.ok) {
                    testimonialModal.style.display = 'none';
                    addTestimonialForm.reset();
                    await fetchTestimonials();
                } else {
                    const errData = await response.json();
                    alert(errData.message || 'Failed to add testimonial.');
                }
            } catch (err) {
                console.error('Error adding testimonial:', err);
                alert('An unexpected error occurred.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Add Testimonial';
            }
        });
    }

    // Testimonials Card actions (delete review)
    const testimonialsCard = document.getElementById('testimonials-card');
    if (testimonialsCard) {
        testimonialsCard.addEventListener('click', async (event) => {
            if (event.target.classList.contains('delete-testimonial-btn')) {
                const testimonialId = event.target.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this testimonial?')) {
                    try {
                        const response = await fetch('/api/testimonials', {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${jwtToken}`
                            },
                            body: JSON.stringify({ id: testimonialId })
                        });

                        if (response.ok) {
                            await fetchTestimonials();
                        } else {
                            const errData = await response.json();
                            alert(errData.message || 'Failed to delete testimonial.');
                        }
                    } catch (err) {
                        console.error('Error deleting testimonial:', err);
                        alert('An unexpected error occurred.');
                    }
                }
            }
        });
    }

    // Close testimonials modal on outside click
    window.addEventListener('click', (event) => {
        if (event.target === testimonialModal) {
            testimonialModal.style.display = 'none';
        }
        if (event.target === visualModal) {
            closeVisualEditor();
        }
    });

    // --- Visual Page Preview Editor Logic ---
    const visualModal = document.getElementById('visual-edit-modal');
    const visualForm = document.getElementById('visual-edit-form');
    const closeVisualBtn = document.getElementById('close-visual-edit-modal');
    const cancelVisualBtn = document.getElementById('cancel-visual-edit-btn');
    const saveVisualBtn = document.getElementById('save-visual-edit-btn');
    const exportHtmlBtn = document.getElementById('export-html-btn');

    const visualPageId = document.getElementById('visual-edit-page-id');
    const visualBusinessName = document.getElementById('visual-edit-business-name');
    const visualService = document.getElementById('visual-edit-service');
    const visualTown = document.getElementById('visual-edit-town');
    const visualZipcode = document.getElementById('visual-edit-zipcode');
    const visualTelephone = document.getElementById('visual-edit-telephone');
    const visualPricerange = document.getElementById('visual-edit-pricerange');
    const visualOpeninghours = document.getElementById('visual-edit-openinghours');
    const visualColor = document.getElementById('visual-edit-color');
    const visualColorHex = document.getElementById('visual-edit-color-hex');
    const visualEnableAI = document.getElementById('visual-edit-enable-ai-copy');
    const visualAiStyleGroup = document.getElementById('visual-edit-ai-style-group');
    const visualAiStyle = document.getElementById('visual-edit-ai-style');
    const visualAiKeywords = document.getElementById('visual-edit-ai-keywords');

    const visualIframe = document.getElementById('visual-preview-iframe');
    const visualLoading = document.getElementById('visual-preview-loading');
    const btnDesktop = document.getElementById('preview-dev-desktop');
    const btnMobile = document.getElementById('preview-dev-mobile');

    let reloadTimeout = null;

    function applyIframeStyling() {
        try {
            if (visualIframe.contentWindow && visualIframe.contentWindow.document) {
                const doc = visualIframe.contentWindow.document;
                doc.documentElement.style.setProperty('--primary-color', visualColor.value);
            }
        } catch (e) {
            console.error('Error applying live CSS tweak to preview:', e);
        }
    }

    function updatePreviewIframe(forceReload = false) {
        if (!visualPageId.value) return;

        const params = new URLSearchParams({
            businessName: visualBusinessName.value || '',
            service: visualService.value || '',
            town: visualTown.value || '',
            primaryColor: visualColor.value || '#3b82f6',
            telephone: visualTelephone.value || '',
            priceRange: visualPricerange.value || '',
            openingHours: visualOpeninghours.value || ''
        });

        if (forceReload) {
            visualLoading.style.opacity = '1';
            visualLoading.style.pointerEvents = 'all';
            visualIframe.src = '/api/preview?' + params.toString();
            visualIframe.onload = () => {
                visualLoading.style.opacity = '0';
                visualLoading.style.pointerEvents = 'none';
                applyIframeStyling();
            };
        } else {
            applyIframeStyling();
        }
    }

    function debouncePreviewReload() {
        if (reloadTimeout) clearTimeout(reloadTimeout);
        reloadTimeout = setTimeout(() => {
            updatePreviewIframe(true);
        }, 500);
    }

    function openVisualEditor(pageId) {
        const page = userPages.find(p => p.pageId === pageId);
        if (!page) return;

        visualPageId.value = page.pageId;
        visualBusinessName.value = page.businessName || '';
        visualService.value = page.service || '';
        visualTown.value = page.town || '';
        visualZipcode.value = page.zipCode || '';
        visualTelephone.value = page.telephone || '';
        visualPricerange.value = page.priceRange || '';
        visualOpeninghours.value = page.openingHours || '';
        
        const defaultColor = page.primaryColor || '#3b82f6';
        visualColor.value = defaultColor;
        visualColorHex.value = defaultColor.toUpperCase();
        
        // Highlight active preset color if it matches
        const presetButtons = document.querySelectorAll('#visual-edit-presets .preset-btn');
        presetButtons.forEach(btn => {
            if (btn.getAttribute('data-color').toLowerCase() === defaultColor.toLowerCase()) {
                btn.style.borderColor = '#fff';
            } else {
                btn.style.borderColor = 'rgba(255,255,255,0.2)';
            }
        });

        visualEnableAI.checked = !!page.enableAICopy;
        visualAiStyleGroup.style.display = page.enableAICopy ? 'flex' : 'none';
        visualAiStyle.value = page.aiStyle || 'professional';
        visualAiKeywords.value = page.aiKeywords || '';

        // Reset device toggle to desktop style
        btnDesktop.style.background = 'rgba(255, 255, 255, 0.1)';
        btnDesktop.style.color = '#fff';
        btnMobile.style.background = 'transparent';
        btnMobile.style.color = '#9ca3af';
        visualIframe.style.width = '100%';
        visualIframe.style.maxWidth = '100%';

        visualModal.style.display = 'flex';
        updatePreviewIframe(true);
    }

    // Input listeners for instant visual CSS updates or debounced text updates
    visualBusinessName.addEventListener('input', debouncePreviewReload);
    visualService.addEventListener('input', debouncePreviewReload);
    visualTown.addEventListener('input', debouncePreviewReload);
    visualZipcode.addEventListener('input', debouncePreviewReload);
    visualTelephone.addEventListener('input', debouncePreviewReload);
    visualPricerange.addEventListener('input', debouncePreviewReload);
    visualOpeninghours.addEventListener('input', debouncePreviewReload);

    visualColor.addEventListener('input', (e) => {
        const color = e.target.value;
        visualColorHex.value = color.toUpperCase();
        applyIframeStyling();
    });

    visualColorHex.addEventListener('input', (e) => {
        let color = e.target.value;
        if (color.startsWith('#') && (color.length === 4 || color.length === 7)) {
            visualColor.value = color;
            applyIframeStyling();
        }
    });

    const presetButtonsList = document.querySelectorAll('#visual-edit-presets .preset-btn');
    presetButtonsList.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtonsList.forEach(p => p.style.borderColor = 'rgba(255,255,255,0.2)');
            btn.style.borderColor = '#fff';
            
            const color = btn.getAttribute('data-color');
            visualColor.value = color;
            visualColorHex.value = color.toUpperCase();
            applyIframeStyling();
        });
    });

    visualEnableAI.addEventListener('change', function() {
        visualAiStyleGroup.style.display = this.checked ? 'flex' : 'none';
        debouncePreviewReload();
    });

    visualAiStyle.addEventListener('change', debouncePreviewReload);
    visualAiKeywords.addEventListener('input', debouncePreviewReload);

    // Device View Toggles
    btnDesktop.addEventListener('click', () => {
        btnDesktop.style.background = 'rgba(255, 255, 255, 0.1)';
        btnDesktop.style.color = '#fff';
        btnMobile.style.background = 'transparent';
        btnMobile.style.color = '#9ca3af';
        
        visualIframe.style.width = '100%';
        visualIframe.style.maxWidth = '100%';
    });

    btnMobile.addEventListener('click', () => {
        btnMobile.style.background = 'rgba(255, 255, 255, 0.1)';
        btnMobile.style.color = '#fff';
        btnDesktop.style.background = 'transparent';
        btnDesktop.style.color = '#9ca3af';
        
        visualIframe.style.width = '375px';
        visualIframe.style.maxWidth = '100%';
    });

    // Close Modal helpers
    const closeVisualEditor = () => {
        visualModal.style.display = 'none';
        visualIframe.src = 'about:blank';
    };
    closeVisualBtn.addEventListener('click', closeVisualEditor);
    cancelVisualBtn.addEventListener('click', closeVisualEditor);

    // Save Page
    saveVisualBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        saveVisualBtn.disabled = true;
        const originalText = saveVisualBtn.innerHTML;
        saveVisualBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        try {
            const response = await fetch('/api/update-page', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`
                },
                body: JSON.stringify({
                    pageId: visualPageId.value,
                    businessName: visualBusinessName.value,
                    service: visualService.value,
                    town: visualTown.value,
                    zipCode: visualZipcode.value,
                    telephone: visualTelephone.value,
                    priceRange: visualPricerange.value,
                    openingHours: visualOpeninghours.value,
                    enableAICopy: visualEnableAI.checked,
                    aiStyle: visualAiStyle.value,
                    aiKeywords: visualAiKeywords.value,
                    primaryColor: visualColor.value
                })
            });
            
            if (response.ok) {
                closeVisualEditor();
                await fetchDashboardData();
            } else {
                const data = await response.json();
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error updating page:', error);
            alert('Failed to update page.');
        } finally {
            saveVisualBtn.disabled = false;
            saveVisualBtn.innerHTML = originalText;
        }
    });

    // Export HTML file
    exportHtmlBtn.addEventListener('click', async () => {
        exportHtmlBtn.disabled = true;
        const originalText = exportHtmlBtn.innerHTML;
        exportHtmlBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
        
        try {
            const params = new URLSearchParams({
                businessName: visualBusinessName.value,
                service: visualService.value,
                town: visualTown.value,
                primaryColor: visualColor.value,
                telephone: visualTelephone.value,
                priceRange: visualPricerange.value,
                openingHours: visualOpeninghours.value,
                export: 'true'
            });
            
            const response = await fetch('/api/preview?' + params.toString());
            if (response.ok) {
                const html = await response.text();
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                const filename = `${visualService.value.toLowerCase().replace(/\s+/g, '-')}-in-${visualTown.value.toLowerCase().replace(/\s+/g, '-')}.html`;
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                alert('Failed to generate export file.');
            }
        } catch (err) {
            console.error('Error exporting page:', err);
            alert('An unexpected error occurred during export.');
        } finally {
            exportHtmlBtn.disabled = false;
            exportHtmlBtn.innerHTML = originalText;
        }
    });

    function updateActivationChecklist(data) {
        const checklistCard = document.getElementById('activation-checklist-card');
        if (!checklistCard) return;

        let completedSteps = 0;
        const totalSteps = 5;

        // Helper to update status badge
        function updateStep(itemId, isCompleted, linkText = '') {
            const item = document.getElementById(itemId);
            if (!item) return;

            const badge = item.querySelector('.status-badge');
            const button = item.querySelector('.button');

            if (isCompleted) {
                completedSteps++;
                item.classList.add('completed');
                if (badge) {
                    badge.style.background = 'rgba(16, 185, 129, 0.1)';
                    badge.style.color = '#10b981';
                    badge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                    badge.innerHTML = '<i class="fas fa-check-circle"></i> Done';
                }
                if (button) {
                    button.textContent = linkText || 'Manage';
                    button.classList.add('button-secondary');
                }
            } else {
                item.classList.remove('completed');
                if (badge) {
                    badge.style.background = 'rgba(239, 68, 68, 0.1)';
                    badge.style.color = '#ef4444';
                    badge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                    badge.textContent = 'Todo';
                }
                if (button) {
                    if (itemId === 'chk-generate') {
                        button.textContent = 'Go to Generator';
                    } else if (itemId === 'chk-widget') {
                        button.textContent = 'Get Embed Code';
                    } else if (itemId === 'chk-domain') {
                        button.textContent = 'Set Domain';
                    } else if (itemId === 'chk-alerts') {
                        button.textContent = 'Set Up Alerts';
                    } else if (itemId === 'chk-reviews') {
                        button.textContent = 'Setup Booster';
                    }
                    button.classList.remove('button-secondary');
                }
            }
        }

        // Step 1: Create SEO Pages
        const pagesCompleted = data.generatedPages && data.generatedPages.length > 0;
        updateStep('chk-generate', pagesCompleted, 'Generate More');

        // Step 2: Add to Website (Widget CSS styling is configured OR client clicked wp plugin/widget button and has views)
        let totalViews = 0;
        if (data.generatedPages) {
            totalViews = data.generatedPages.reduce((acc, p) => acc + (p.views || 0), 0);
        }
        const integratedLocal = localStorage.getItem('localleads_integrated') === 'true';
        const widgetCompleted = !!((data.widgetCss && data.widgetCss.trim().length > 0) || totalViews > 0 || integratedLocal);
        updateStep('chk-widget', widgetCompleted, 'Widget Settings');

        // Step 3: Custom Domain
        const domainCompleted = !!(data.customDomain && data.customDomain.trim().length > 0);
        updateStep('chk-domain', domainCompleted, 'Domain Details');

        // Step 4: Lead Alerts
        const alertsCompleted = !!(data.webhookEnabled || data.smsEnabled);
        updateStep('chk-alerts', alertsCompleted, 'Alerts Config');

        // Step 5: Reputation Booster
        const reviewsCompleted = !!(data.googleReviewLink || data.facebookReviewLink || data.yelpReviewLink);
        updateStep('chk-reviews', reviewsCompleted, 'Booster Config');

        // Update progress bar
        const progressPercent = Math.round((completedSteps / totalSteps) * 100);
        const progressBar = document.getElementById('activation-progress-bar');
        const progressText = document.getElementById('activation-progress-text');

        if (progressBar) {
            progressBar.style.width = `${progressPercent}%`;
        }
        if (progressText) {
            progressText.textContent = `${progressPercent}% Completed`;
        }

        // Add visual celebration if 100% complete
        if (progressPercent === 100) {
            const title = checklistCard.querySelector('h2');
            if (title && !document.getElementById('chk-activated-badge')) {
                const badge = document.createElement('span');
                badge.id = 'chk-activated-badge';
                badge.style.cssText = `
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                    color: #000;
                    font-size: 0.75rem;
                    font-weight: 900;
                    padding: 4px 10px;
                    border-radius: 20px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-left: 10px;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    box-shadow: 0 2px 10px rgba(245, 158, 11, 0.4);
                `;
                badge.innerHTML = '<i class="fas fa-crown"></i> Fully Activated';
                title.appendChild(badge);
            }
        } else {
            const badge = document.getElementById('chk-activated-badge');
            if (badge) badge.remove();
        }
    }
});
