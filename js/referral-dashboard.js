document.addEventListener('DOMContentLoaded', async () => {
    const referralLinkInput = document.getElementById('referralLink');
    const copyButton = document.getElementById('copyButton');
    const clicksCountSpan = document.getElementById('clicksCount');
    const signupsCountSpan = document.getElementById('signupsCount');
    const totalEarnedSpan = document.getElementById('totalEarned');
    const referredUsersTableBody = document.querySelector('#referredUsersTable tbody');

    // Function to fetch referral data
    async function fetchReferralData() {
        try {
            const response = await fetch('/api/user-referral-data');
            
            if (response.status === 401) {
                window.location.href = '/auth.html';
                return;
            }

            const data = await response.json();

            if (response.ok) {
                const baseUrl = window.location.origin; // Get the base URL
                referralLinkInput.value = `${baseUrl}/auth.html?ref=${data.referralCode}`;
                clicksCountSpan.textContent = data.clicks;
                signupsCountSpan.textContent = data.signups;
                totalEarnedSpan.textContent = data.totalEarned.toFixed(2); // Format to 2 decimal places

                // Clear existing table rows
                referredUsersTableBody.innerHTML = '';

                // Populate referred users table
                data.referredUsers.forEach(user => {
                    const row = referredUsersTableBody.insertRow();
                    row.insertCell().textContent = user.email;
                    row.insertCell().textContent = new Date(user.date).toLocaleDateString();
                    row.insertCell().textContent = user.status;
                    row.insertCell().textContent = `$${parseFloat(user.commission).toFixed(2)}`;
                });
            } else {
                console.error('Failed to fetch referral data:', data.message);
                referralLinkInput.value = 'Error loading referral link.';
            }
        } catch (error) {
            console.error('Error fetching referral data:', error);
            referralLinkInput.value = 'Error loading referral link.';
            // Optionally show a message on the dashboard itself
        }
    }

    // Call the function to fetch data on page load
    fetchReferralData();

    // Copy link functionality
    copyButton.addEventListener('click', () => {
        referralLinkInput.select();
        referralLinkInput.setSelectionRange(0, 99999); // For mobile devices
        document.execCommand('copy');
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
            copyButton.textContent = 'Copy Link';
        }, 2000);
    });
});
