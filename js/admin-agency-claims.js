document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('#agency-claims .data-table tbody');
    if (!tableBody) {
        return; // Not on the agency claims page
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const secret = urlParams.get('secret') || '';
        const response = await fetch(`/api/get-agency-claims?secret=${encodeURIComponent(secret)}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch agency claims: ${response.statusText}`);
        }

        const claims = await response.json();

        if (claims.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No agency directory profiles have been claimed yet.</td></tr>';
            return;
        }

        // Clear existing rows
        tableBody.innerHTML = '';

        claims.forEach(claim => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${claim.agencyName || 'N/A'}</strong></td>
                <td><a href="${claim.website}" target="_blank" style="color: #8b5cf6; text-decoration: none;">${claim.website || 'N/A'}</a></td>
                <td><span class="badge" style="background: rgba(139, 92, 246, 0.1); color: #a78bfa; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${claim.city || 'N/A'}</span></td>
                <td><code style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">${claim.slug || 'N/A'}</code></td>
                <td><a href="mailto:${claim.claimedEmail}" style="color: #3b82f6; text-decoration: none;">${claim.claimedEmail}</a></td>
                <td><strong style="color: #10b981;">${claim.userCredits}</strong></td>
                <td>${claim.claimedAt ? new Date(claim.claimedAt).toLocaleString() : 'N/A'}</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error fetching and displaying agency claims:', error);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 2rem;">Failed to load agency claims. Please check your admin secret and try again.</td></tr>';
    }
});
