document.addEventListener("DOMContentLoaded", async function() {
    // Function to copy referral link to clipboard
    const copyReferralLinkButton = document.getElementById("copyReferralLink");
    const referralLinkInput = document.getElementById("referralLink");

    if (copyReferralLinkButton && referralLinkInput) {
        copyReferralLinkButton.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(referralLinkInput.value);
                copyReferralLinkButton.textContent = "Copied!";
                setTimeout(() => {
                    copyReferralLinkButton.textContent = "Copy Link";
                }, 2000);
            } catch (err) {
                console.error("Failed to copy referral link: ", err);
                alert("Failed to copy link. Please copy it manually: " + referralLinkInput.value);
            }
        });
    }

    // Placeholder for fetching referral data
    // In a real application, this would fetch data from an API endpoint
    // For now, we'll simulate some data
    const fetchReferralData = async () => {
        const response = await fetch('/api/user-referral-data');
        if (!response.ok) {
            if (response.status === 401) {
                // Not authenticated, redirect to login page
                window.location.href = '/auth.html';
                return null;
            }
            throw new Error(`Failed to fetch referral data: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    };

    const updateDashboard = async () => {
        try {
            const data = await fetchReferralData();
            if (!data) {
                // Authentication failed or redirect occurred, do not proceed with updating dashboard elements
                return;
            }

            if (referralLinkInput) {
                referralLinkInput.value = data.referralLink;
            }
            const totalReferralsElement = document.getElementById("totalReferrals");
            if (totalReferralsElement) {
                totalReferralsElement.textContent = data.totalReferrals;
            }

            const convertedReferralsElement = document.getElementById("convertedReferrals");
            if (convertedReferralsElement) {
                convertedReferralsElement.textContent = data.convertedReferrals;
            }

            const earnedRewardsElement = document.getElementById("earnedRewards");
            if (earnedRewardsElement) {
                earnedRewardsElement.textContent = `$${data.earnedRewards}`;
            }

            const recentReferralsTableBody = document.querySelector("#recent-referrals tbody");
            if (recentReferralsTableBody) {
                if (data.recentReferrals && data.recentReferrals.length > 0) {
                    recentReferralsTableBody.innerHTML = ""; // Clear existing placeholder
                    data.recentReferrals.forEach(referral => {
                        const row = `
                            <tr>
                                <td>${referral.user}</td>
                                <td>${referral.status}</td>
                                <td>${referral.date}</td>
                                <td>${referral.reward}</td>
                            </tr>
                        `;
                        recentReferralsTableBody.insertAdjacentHTML("beforeend", row);
                    });
                } else {
                    recentReferralsTableBody.innerHTML = `<tr><td colspan="4">No recent referrals.</td></tr>`;
                }
            }
        } catch (error) {
            console.error("Error updating referral dashboard:", error);
            // Display an error message on the dashboard if data fetching fails
            const referralLinkSection = document.querySelector(".referral-link-section");
            if (referralLinkSection) {
                referralLinkSection.innerHTML = "<p class='error-message'>Failed to load referral data. Please try again later.</p>";
            }
        }
    };

    // Initial dashboard update
    updateDashboard();
});
