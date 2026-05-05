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

// Example: Track a page view on load
document.addEventListener('DOMContentLoaded', () => {
  // You would typically get the userId from an authenticated session or a cookie
  // For now, userId is null or hardcoded for demonstration
  trackEvent('page_view', { path: window.location.pathname });
});
