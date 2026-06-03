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

    let userPages = [];

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

                // Populate generated pages
                generatedPagesTableBody.innerHTML = '';
                if (data.generatedPages && data.generatedPages.length > 0) {
                    userPages = data.generatedPages;
                    data.generatedPages.forEach(page => {
                        const row = generatedPagesTableBody.insertRow();
                        row.innerHTML = `
                            <td>${page.businessName}</td>
                            <td>${page.service}</td>
                            <td>${page.town}</td>
                            <td>${page.views || 0}</td>
                            <td>${page.uniqueVisitors || 0}</td>
                            <td>
                                <a href="${page.url}" target="_blank" class="button button-small">View</a>
                                <button class="button button-small button-secondary edit-page-btn" data-id="${page.pageId}">Edit</button>
                                <button class="button button-small button-danger delete-page-btn" data-id="${page.pageId}">Delete</button>
                            </td>
                        `;
                    });
                } else {
                    userPages = [];
                    generatedPagesTableBody.innerHTML = '<tr><td colspan="6">No pages generated yet.</td></tr>';
                }

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

    // Event delegation for Edit and Delete buttons
    generatedPagesTableBody.addEventListener('click', (event) => {
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
                editModal.style.display = 'flex';
            }
        } else if (event.target.classList.contains('delete-page-btn')) {
            const pageId = event.target.getAttribute('data-id');
            document.getElementById('delete-page-id').value = pageId;
            deleteModal.style.display = 'flex';
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
                        openingHours
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
});
