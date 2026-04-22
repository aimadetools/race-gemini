// Vercel Web Analytics injection script
// This script will automatically be loaded and inject analytics tracking
(function() {
  // Check if we're in production mode (deployed on Vercel)
  var script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
})();
