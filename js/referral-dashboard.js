document.addEventListener('DOMContentLoaded', async () => {
    const referralLinkInput = document.getElementById('referralLink');
    const copyButton = document.getElementById('copyButton');
    const clicksCountSpan = document.getElementById('clicksCount');
    const signupsCountSpan = document.getElementById('signupsCount');
    const totalEarnedSpan = document.getElementById('totalEarned');
    const rankValueDiv = document.getElementById('rankValue');
    const referredUsersTableBody = document.querySelector('#referredUsersTable tbody');
    const leaderboardTableBody = document.querySelector('#leaderboardTable tbody');
    const logoutBtn = document.getElementById('logoutBtn');

    // Fetch and sync all affiliate/referral data
    async function initAffiliateDashboard() {
        try {
            // Fetch both personal data and the public leaderboard
            const [referralRes, leaderboardRes] = await Promise.all([
                fetch('/api/user-referral-data'),
                fetch('/api/referral-leaderboard')
            ]);

            // Authentication gate
            if (referralRes.status === 401 || leaderboardRes.status === 401) {
                window.location.href = '/auth.html';
                return;
            }

            if (!referralRes.ok || !leaderboardRes.ok) {
                throw new Error('Failed to load affiliate details.');
            }

            const referralData = await referralRes.json();
            const leaderboardData = await leaderboardRes.json();

            // 1. Unique Referral Link Setup
            const baseUrl = window.location.origin;
            referralLinkInput.value = `${baseUrl}/auth.html?ref=${referralData.referralCode}`;

            // 2. Personal Stats Boxes
            clicksCountSpan.textContent = referralData.clicks || 0;
            signupsCountSpan.textContent = referralData.signups || 0;
            totalEarnedSpan.textContent = (referralData.totalEarned || 0).toFixed(2);

            // Set Rank Value Display
            const userRank = leaderboardData.userStanding?.rank;
            if (typeof userRank === 'number') {
                rankValueDiv.textContent = `#${userRank}`;
            } else {
                rankValueDiv.textContent = userRank || 'Not Ranked';
                rankValueDiv.style.fontSize = '1.35rem';
                rankValueDiv.style.fontWeight = '600';
            }

            // 3. Render Referrals History Table
            referredUsersTableBody.innerHTML = '';
            if (referralData.referredUsers && referralData.referredUsers.length > 0) {
                referralData.referredUsers.forEach(user => {
                    const row = referredUsersTableBody.insertRow();
                    
                    // User Email Cell
                    const emailCell = row.insertCell();
                    emailCell.textContent = user.email;
                    emailCell.style.fontWeight = '500';

                    // Date Joined Cell
                    const dateCell = row.insertCell();
                    dateCell.textContent = new Date(user.date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });

                    // Status Badge Cell
                    const statusCell = row.insertCell();
                    const statusVal = (user.status || 'trial').toLowerCase();
                    const badge = document.createElement('span');
                    badge.className = `badge-status ${statusVal}`;
                    badge.textContent = user.status || 'Trial';
                    statusCell.appendChild(badge);

                    // Commission Earned Cell
                    const commissionCell = row.insertCell();
                    commissionCell.style.textAlign = 'right';
                    commissionCell.style.fontWeight = '600';
                    commissionCell.style.color = 'var(--color-emerald)';
                    commissionCell.textContent = `$${parseFloat(user.commission || 0).toFixed(2)}`;
                });
            } else {
                referredUsersTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-state">
                            <i class="fas fa-users-slash"></i> You haven't referred any users yet. Share your link to start earning!
                        </td>
                    </tr>
                `;
            }

            // 4. Render Leaderboard Table
            leaderboardTableBody.innerHTML = '';
            const top10 = leaderboardData.leaderboard || [];
            
            if (top10.length > 0) {
                top10.forEach(item => {
                    const row = leaderboardTableBody.insertRow();
                    
                    // Highlight the current user's row
                    if (item.isCurrentUser) {
                        row.className = 'leaderboard-row-current';
                    }

                    // Rank Medal Cell
                    const rankCell = row.insertCell();
                    const rankBadge = document.createElement('span');
                    rankBadge.className = `rank-badge`;
                    if (item.rank === 1) rankBadge.classList.add('top-1');
                    else if (item.rank === 2) rankBadge.classList.add('top-2');
                    else if (item.rank === 3) rankBadge.classList.add('top-3');
                    rankBadge.textContent = item.rank;
                    rankCell.appendChild(rankBadge);

                    // Partner Name Cell
                    const nameCell = row.insertCell();
                    nameCell.textContent = item.name;
                    nameCell.style.fontWeight = '500';
                    if (item.isCurrentUser) {
                        const youBadge = document.createElement('span');
                        youBadge.className = 'badge-you';
                        youBadge.textContent = 'You';
                        nameCell.appendChild(youBadge);
                    }

                    // Signups Count Cell
                    const signupsCell = row.insertCell();
                    signupsCell.style.textAlign = 'center';
                    signupsCell.textContent = item.referralsCount;

                    // Commissions Earned Cell
                    const commissionCell = row.insertCell();
                    commissionCell.style.textAlign = 'right';
                    commissionCell.style.fontWeight = '600';
                    commissionCell.style.color = item.totalCommission > 0 ? 'var(--color-emerald)' : 'var(--text-secondary)';
                    commissionCell.textContent = `$${item.totalCommission.toFixed(2)}`;
                });
            } else {
                leaderboardTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-state">
                            <i class="fas fa-trophy"></i> Leaderboard is currently empty.
                        </td>
                    </tr>
                `;
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            referralLinkInput.value = 'Error loading referral link.';
            rankValueDiv.textContent = 'Error';
            referredUsersTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state" style="color: #ef4444;">
                        <i class="fas fa-exclamation-circle"></i> Failed to load referral data. Please reload the page.
                    </td>
                </tr>
            `;
            leaderboardTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state" style="color: #ef4444;">
                        <i class="fas fa-exclamation-circle"></i> Failed to load leaderboard rankings.
                    </td>
                </tr>
            `;
        }
    }

    // Copy to clipboard functionality
    copyButton.addEventListener('click', () => {
        referralLinkInput.select();
        referralLinkInput.setSelectionRange(0, 99999); // Mobile compatibility
        
        try {
            navigator.clipboard.writeText(referralLinkInput.value)
                .then(showCopySuccess)
                .catch(() => {
                    // Fallback to execCommand if clipboard API fails
                    document.execCommand('copy');
                    showCopySuccess();
                });
        } catch (err) {
            document.execCommand('copy');
            showCopySuccess();
        }
    });

    function showCopySuccess() {
        copyButton.innerHTML = '<i class="fas fa-check"></i> Link Copied!';
        copyButton.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        setTimeout(() => {
            copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy Link';
            copyButton.style.background = '';
        }, 2000);
    }

    // Logout handling
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/auth.html';
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = '/auth.html';
            }
        });
    }

    // Run on startup
    initAffiliateDashboard();
});
