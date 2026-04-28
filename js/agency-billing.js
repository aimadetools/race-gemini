document.addEventListener('DOMContentLoaded', async () => {
    const currentPlanDisplay = document.getElementById('current-plan-display');
    const currentPlanStatus = document.getElementById('current-plan-status');
    const currentPlanCredits = document.getElementById('current-plan-credits');
    const currentPlanRenewsOn = document.getElementById('current-plan-renews-on');
    const creditHistoryBody = document.getElementById('credit-history-body');

    async function fetchAgencySubscription() {
        try {
            const response = await fetch('/api/get-agency-subscription');
            const data = await response.json();

            if (response.ok) {
                if (data.status === 'active') {
                    currentPlanDisplay.textContent = data.plan ? `Current Plan: ${data.plan}` : 'Current Plan: N/A';
                    currentPlanStatus.textContent = 'Active';
                    currentPlanCredits.textContent = data.creditsPerMonth || 'N/A';
                    currentPlanRenewsOn.textContent = data.renewsOn ? new Date(data.renewsOn).toLocaleDateString() : 'N/A';
                } else {
                    currentPlanDisplay.textContent = 'No Active Plan';
                    currentPlanStatus.textContent = data.status || 'Inactive';
                    currentPlanCredits.textContent = 'N/A';
                    currentPlanRenewsOn.textContent = 'N/A';
                }
                updatePlanButtons(data.plan);
            } else {
                if (response.status === 401) {
                    alert(data.message || 'You are not logged in. Please log in to manage your subscription.');
                    window.location.href = '/agency-login.html';
                } else {
                    console.error('Error fetching subscription:', data.message);
                    currentPlanDisplay.textContent = 'Error loading plan details.';
                }
            }
        } catch (error) {
            console.error('Fetch error for subscription:', error);
            currentPlanDisplay.textContent = 'An unexpected error occurred.';
        }
    }

    async function fetchCreditHistory() {
        try {
            const response = await fetch('/api/get-agency-credit-history');
            const data = await response.json();

            if (response.ok) {
                creditHistoryBody.innerHTML = '';
                if (data.length === 0) {
                    const row = document.createElement('tr');
                    const cell = document.createElement('td');
                    cell.colSpan = 3;
                    cell.textContent = 'No credit assignments yet.';
                    row.appendChild(cell);
                    creditHistoryBody.appendChild(row);
                } else {
                    data.forEach(item => {
                        const historyItem = JSON.parse(item);
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${historyItem.clientName}</td>
                            <td>${historyItem.credits}</td>
                            <td>${new Date(historyItem.date).toLocaleDateString()}</td>
                        `;
                        creditHistoryBody.appendChild(row);
                    });
                }
            } else {
                console.error('Error fetching credit history:', data.message);
            }
        } catch (error) {
            console.error('Fetch error for credit history:', error);
        }
    }

    function updatePlanButtons(currentPlan) {
        document.querySelectorAll('.price-cards .card').forEach(card => {
            const planName = card.querySelector('h3').textContent.trim();
            const button = card.querySelector('button[type="button"]'); // Changed selector

            if (planName === currentPlan) {
                button.textContent = 'Current Plan';
                button.disabled = true;
                button.classList.add('button-secondary'); // Grey out or visually indicate current
                button.classList.remove('button');
            } else {
                button.textContent = 'Choose Plan';
                button.disabled = false;
                button.classList.add('button');
                button.classList.remove('button-secondary');
            }
        });
    }

    async function handlePlanChange(newPriceId) {
        if (!confirm('Are you sure you want to change your plan?')) {
            return;
        }

        try {
            const response = await fetch('/api/update-agency-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPriceId }),
            });

            const data = await response.json();
            if (response.ok) {
                alert(data.message || 'Subscription plan updated successfully!');
                await fetchAgencySubscription(); // Refresh details
            } else {
                alert(data.message || 'Failed to update subscription plan.');
            }
        } catch (error) {
            console.error('Error updating subscription plan:', error);
            alert('An unexpected error occurred during plan update.');
        }
    }

    // Make handlePlanChange globally accessible for onclick attributes
    window.handlePlanChange = handlePlanChange;

    fetchAgencySubscription();
    fetchCreditHistory();
});
