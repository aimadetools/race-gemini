document.addEventListener('DOMContentLoaded', () => {
    const jwtToken = localStorage.getItem('token');
    if (!jwtToken) {
        window.location.href = '/auth.html';
        return;
    }

    const generatedPagesTableBody = document.querySelector('#generated-pages tbody');
    const loadMoreContainer = document.getElementById('load-more-container');
    const loadMoreButton = document.getElementById('load-more-pages');

    const onboardingMessage = document.getElementById('dashboard-onboarding-message');
    const dismissOnboardingButton = document.getElementById('dismiss-dashboard-onboarding');

    let offset = 0;
    const limit = 10; // Number of pages to load per request

    async function fetchGeneratedPages() {
        try {
            const response = await fetch(`/api/dashboard/pages?offset=${offset}&limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.pages.length > 0) {
                    data.pages.forEach(page => {
                        const row = generatedPagesTableBody.insertRow();
                        row.innerHTML = `
                            <td>${page.businessName}</td>
                            <td>${page.service}</td>
                            <td>${page.town}</td>
                            <td>${page.views || 0}</td>
                            <td>${page.uniqueVisitors || 0}</td>
                            <td>
                                <a href="${page.url}" target="_blank" class="button button-small">View</a>
                                <button class="button button-small button-secondary">Edit</button>
                                <button class="button button-small button-danger">Delete</button>
                            </td>
                        `;
                    });
                    offset += data.pages.length;
                    if (data.pages.length < limit) {
                        loadMoreContainer.style.display = 'none'; // Hide button if no more pages
                    } else {
                        loadMoreContainer.style.display = 'block';
                    }
                } else {
                    if (offset === 0) { // No pages at all
                        generatedPagesTableBody.innerHTML = '<tr><td colspan="6">No pages generated yet.</td></tr>';
                    }
                    loadMoreContainer.style.display = 'none'; // Hide button if no more pages
                }
            } else if (response.status === 401) {
                window.location.href = '/auth.html';
            } else {
                console.error('Error fetching generated pages:', response.statusText);
                alert('Failed to load generated pages.');
            }
        } catch (error) {
            console.error('Fetch error for generated pages:', error);
            alert('An unexpected error occurred while loading generated pages.');
        }
    }

    // Initial load
    fetchGeneratedPages(); // For generated pages table

    // Load More button event listener
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', fetchGeneratedPages);
    }

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
