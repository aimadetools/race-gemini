
document.addEventListener('DOMContentLoaded', () => {
  const referralLink = document.getElementById('referralLink');
  const copyButton = document.getElementById('copyButton');
  const clicksCount = document.getElementById('clicksCount');
  const signupsCount = document.getElementById('signupsCount');
  const totalEarned = document.getElementById('totalEarned');
  const referredUsersTable = document.getElementById('referredUsersTable').getElementsByTagName('tbody')[0];

  // Fetch referral data from the API
  fetch('/api/user-referral-data')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch referral data');
      }
      return response.json();
    })
    .then(data => {
      referralLink.value = `https://localleads.pro/signup?ref=${data.referralCode}`;
      clicksCount.textContent = data.clicks;
      signupsCount.textContent = data.signups;
      totalEarned.textContent = data.totalEarned.toFixed(2);

      // Populate the referred users table
      data.referredUsers.forEach(user => {
        const row = referredUsersTable.insertRow();
        row.innerHTML = `
          <td>${user.email}</td>
          <td>${new Date(user.date).toLocaleDateString()}</td>
          <td>${user.status}</td>
          <td>$${user.commission.toFixed(2)}</td>
        `;
      });
    })
    .catch(error => {
      console.error('Error fetching referral data:', error);
      // Display an error message to the user
      const dashboard = document.querySelector('main');
      dashboard.innerHTML = '<p class="error">Could not load your referral data. Please try again later.</p>';
    });

  // Copy referral link to clipboard
  copyButton.addEventListener('click', () => {
    referralLink.select();
    document.execCommand('copy');
    copyButton.textContent = 'Copied!';
    setTimeout(() => {
      copyButton.textContent = 'Copy Link';
    }, 2000);
  });
});
