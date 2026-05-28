// js/tracking.js

/**
 * Tracks a user event by sending it to the API.
 * @param {string} eventName - The name of the event (e.g., 'page_view', 'button_click').
 * @param {Object} [eventData] - Optional, arbitrary data associated with the event.
 * @param {string} [userId] - Optional, the ID of the user performing the action.
 */
function trackEvent(eventName, eventData = {}, userId = null) {
  fetch('/api/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventName,
      userId,
      eventData,
    }),
  })
    .then(response => {
      if (!response.ok) {
        console.error('Failed to track event:', response.statusText);
      }
      return response.json();
    })
    .then(data => {
      // console.log('Event tracking response:', data);
    })
    .catch(error => {
      console.error('Error sending track event:', error);
    });
}

// Track page-specific events on load and setup checkout initiation listeners
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  
  // Track page view event (default)
  trackEvent('page_view', { path });

  // Phase 3: Monetization page view events
  if (path.includes('pricing.html') || path === '/pricing') {
    trackEvent('view_pricing', { path });
  }

  if (path.includes('buy-credits.html') || path === '/buy-credits') {
    trackEvent('view_buy_credits', { path });
  }
});

// Track checkout initiation globally on any form submission targeting checkout
document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form && form.action && form.action.includes('/api/checkout')) {
    const creditPackIdInput = form.querySelector('input[name="creditPackId"]');
    const creditPackId = creditPackIdInput ? creditPackIdInput.value : 'unknown';
    const customCreditsInput = form.querySelector('input[name="customCredits"]');
    const eventData = { creditPackId };
    if (customCreditsInput) {
      eventData.customCredits = customCreditsInput.value;
    }
    trackEvent('checkout_initiated', eventData);
  }
});

// Track checkout initiation on buy button clicks globally
document.addEventListener('click', (e) => {
  const button = e.target.closest('.buy-button, .buy-wholesale-button');
  if (button) {
    const packId = button.dataset.packId || 'unknown';
    trackEvent('checkout_initiated', { creditPackId: packId });
  }
});
