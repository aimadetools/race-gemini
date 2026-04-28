document.addEventListener('DOMContentLoaded', async () => {
    const currentPlanName = document.getElementById('current-plan-name');
    const currentSubscriptionStatus = document.getElementById('current-subscription-status');
    const currentMonthlyCredits = document.getElementById('current-monthly-credits');
    const currentRenewalDate = document.getElementById('current-renewal-date');
    const currentNextInvoice = document.getElementById('current-next-invoice');
    const cancelSubscriptionButton = document.getElementById('cancel-subscription-button');

    // Function to fetch and display subscription details
    async function fetchSubscriptionDetails() {
        try {
            const response = await fetch('/api/get-agency-subscription');
            const data = await response.json();

            if (response.ok) {
                if (data.status === 'active') {
                    currentPlanName.textContent = data.plan || 'N/A';
                    currentSubscriptionStatus.textContent = 'Active';
                    currentMonthlyCredits.textContent = data.creditsPerMonth || 'N/A';
                    currentRenewalDate.textContent = data.renewsOn ? new Date(data.renewsOn).toLocaleDateString() : 'N/A';
                    currentNextInvoice.textContent = data.nextInvoiceAmount ? `$${data.nextInvoiceAmount}` : 'N/A';
                    cancelSubscriptionButton.style.display = 'inline-block'; // Show cancel button if active
                } else {
                    currentPlanName.textContent = 'N/A';
                    currentSubscriptionStatus.textContent = data.status || 'Inactive';
                    currentMonthlyCredits.textContent = 'N/A';
                    currentRenewalDate.textContent = 'N/A';
                    currentNextInvoice.textContent = 'N/A';
                    cancelSubscriptionButton.style.display = 'none'; // Hide cancel button if not active
                }
            } else {
                if (response.status === 401) {
                    alert(data.message || 'You are not logged in. Please log in to view your subscription.');
                    window.location.href = '/agency-login.html';
                } else {
                    currentSubscriptionStatus.textContent = data.message || 'Error loading subscription data.';
                    console.error('Error fetching subscription:', data.message);
                }
            }
        } catch (error) {
            currentSubscriptionStatus.textContent = 'An unexpected error occurred while loading subscription data.';
            console.error('Fetch error for subscription:', error);
        }
    }

    // Handle cancel subscription button click
    cancelSubscriptionButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
            try {
                const response = await fetch('/api/cancel-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });

                const data = await response.json();
                if (response.ok) {
                    alert(data.message || 'Subscription cancelled successfully!');
                    fetchSubscriptionDetails(); // Refresh details after cancellation
                } else {
                    alert(data.message || 'Failed to cancel subscription.');
                }
            } catch (error) {
                console.error('Error cancelling subscription:', error);
                alert('An unexpected error occurred during subscription cancellation.');
            }
        }
    });

    fetchSubscriptionDetails(); // Initial fetch
});
