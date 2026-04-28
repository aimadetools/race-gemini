document.addEventListener('DOMContentLoaded', async () => {
    const userEmailSpan = document.getElementById('user-email');
    const userCreditsSpan = document.getElementById('user-credits');
    const generatedPagesDiv = document.getElementById('generated-pages');

    try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();

        if (response.ok) {
            userEmailSpan.textContent = data.email;
            userCreditsSpan.textContent = data.credits;

            if (data.generatedPages && data.generatedPages.length > 0) {
                const tbody = generatedPagesDiv.querySelector('tbody');
                data.generatedPages.forEach(page => {
                    const row = document.createElement('tr');

                    const businessNameCell = document.createElement('td');
                    businessNameCell.textContent = page.businessName;
                    row.appendChild(businessNameCell);

                    const serviceCell = document.createElement('td');
                    serviceCell.textContent = page.service;
                    row.appendChild(serviceCell);

                    const townCell = document.createElement('td');
                    townCell.textContent = page.town;
                    row.appendChild(townCell);

                    const viewsCell = document.createElement('td');
                    viewsCell.textContent = page.views;
                    row.appendChild(viewsCell);

                    const uniqueVisitorsCell = document.createElement('td');
                    uniqueVisitorsCell.textContent = page.uniqueVisitors;
                    row.appendChild(uniqueVisitorsCell);

                    const actionsCell = document.createElement('td');
                    // Add actions here, e.g., a link to view the page
                    const viewLink = document.createElement('a');
                    const serviceSlug = page.service.toLowerCase().replace(/ /g, '-');
                    const townSlug = page.town.toLowerCase().replace(/ /g, '-');
                    viewLink.href = `/${serviceSlug}-in-${townSlug}.html`; // Assuming page is served at root
                    viewLink.textContent = 'View Page';
                    viewLink.target = '_blank'; // Open in new tab
                    actionsCell.appendChild(viewLink);
                    row.appendChild(actionsCell);

                    tbody.appendChild(row);
                });
            } else {
                generatedPagesDiv.querySelector('tbody').innerHTML = '<tr><td colspan="6">No pages generated yet.</td></tr>';
            }
        } else {
            // Handle authentication errors specifically
            if (response.status === 401) {
                alert(data.message || 'You are not logged in. Please log in to view your dashboard.');
                window.location.href = '/auth.html'; // Redirect to login page
            } else {
                generatedPagesDiv.textContent = data.message || 'Error loading dashboard data.';
                console.error('Error fetching dashboard:', data.message);
            }
        }
    } catch (error) {
        generatedPagesDiv.textContent = 'An unexpected error occurred while loading dashboard data.';
        console.error('Fetch error for dashboard:', error);
    }
});