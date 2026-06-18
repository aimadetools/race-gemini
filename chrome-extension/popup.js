document.addEventListener('DOMContentLoaded', () => {
  const mainView = document.getElementById('main-view');
  const loadingView = document.getElementById('loading-view');
  const resultsView = document.getElementById('results-view');
  
  const siteUrlInput = document.getElementById('site-url');
  const serviceTypeSelect = document.getElementById('service-type');
  const runAuditBtn = document.getElementById('run-audit-btn');
  const backBtn = document.getElementById('back-btn');
  
  const progressFill = document.getElementById('progress-fill');
  
  // Results Elements
  const scoreFill = document.getElementById('score-fill');
  const scorePercent = document.getElementById('score-percent');
  const scoreHeadline = document.getElementById('score-headline');
  const scoreSub = document.getElementById('score-sub');
  
  const foundCount = document.getElementById('found-count');
  const foundTownsDiv = document.getElementById('found-towns');
  const missedCount = document.getElementById('missed-count');
  const missedTownsDiv = document.getElementById('missed-towns');
  
  const leadForm = document.getElementById('lead-form');
  const leadEmailInput = document.getElementById('lead-email');
  const leadSuccessMsg = document.getElementById('lead-success');
  const generatePagesCta = document.getElementById('generate-pages-cta');

  const API_BASE_URL = 'https://www.localseogen.com';

  // 1. Get the current active tab URL and prefill input
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        if (url.startsWith('http://') || url.startsWith('https://')) {
          siteUrlInput.value = url;
        }
      }
    });
  }

  // 2. Handle running the audit
  runAuditBtn.addEventListener('click', async () => {
    const url = siteUrlInput.value.trim();
    const service = serviceTypeSelect.value;
    
    if (!url) {
      alert('Please enter a valid website URL.');
      return;
    }

    // Switch to loading view
    mainView.style.display = 'none';
    loadingView.style.display = 'flex';
    progressFill.style.width = '0%';

    // Simulate progress bar increments
    let progress = 0;
    const progressInterval = setInterval(() => {
      if (progress < 85) {
        progress += Math.floor(Math.random() * 8) + 2;
        progressFill.style.width = `${Math.min(progress, 88)}%`;
      }
    }, 250);

    try {
      const response = await fetch(`${API_BASE_URL}/api/free-audit?url=${encodeURIComponent(url)}&service=${encodeURIComponent(service)}`);
      
      clearInterval(progressInterval);
      progressFill.style.width = '100%';

      if (!response.ok) {
        throw new Error('Audit API returned an error.');
      }

      const data = await response.json();
      
      // Delay slightly for smooth transition
      setTimeout(() => {
        loadingView.style.display = 'none';
        resultsView.style.display = 'block';
        displayResults(data, url, service);
      }, 400);

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Audit failed:', error);
      alert('Could not complete local SEO audit. Make sure the website is accessible and try again.');
      
      // Return to main view
      loadingView.style.display = 'none';
      mainView.style.display = 'block';
    }
  });

  // 3. Display Results
  function displayResults(data, targetUrl, service) {
    const found = data.foundPages || [];
    // Convert paths to clean town names
    const foundClean = found.map(p => cleanPageName(p));
    
    const missed = data.missedOpportunities || [];
    const missedClean = missed.map(p => cleanPageName(p));

    const total = found.length + missed.length;
    const score = total > 0 ? Math.round((found.length / total) * 100) : 0;

    // Update circular ring
    scorePercent.innerText = `${score}%`;
    scoreFill.setAttribute('stroke-dasharray', `${score}, 100`);

    // Color code and headlines based on score
    if (score >= 70) {
      scoreFill.style.stroke = 'var(--success)';
      scoreHeadline.innerText = 'Excellent Reach';
      scoreHeadline.style.color = 'var(--success)';
      scoreSub.innerText = 'Good local organic search footprint.';
    } else if (score >= 35) {
      scoreFill.style.stroke = 'var(--warning)';
      scoreHeadline.innerText = 'Moderate Reach';
      scoreHeadline.style.color = 'var(--warning)';
      scoreSub.innerText = 'Missing major nearby service areas.';
    } else {
      scoreFill.style.stroke = 'var(--error)';
      scoreHeadline.innerText = 'Poor Coverage';
      scoreHeadline.style.color = 'var(--error)';
      scoreSub.innerText = 'High risk of losing leads to competitors.';
    }

    // Update counts
    foundCount.innerText = foundClean.length;
    missedCount.innerText = missedClean.length;

    // Populate covered towns list
    foundTownsDiv.innerHTML = '';
    if (foundClean.length > 0) {
      foundClean.forEach(town => {
        const item = document.createElement('div');
        item.className = 'town-item found-item';
        item.innerHTML = `✓ ${town}`;
        foundTownsDiv.appendChild(item);
      });
    } else {
      foundTownsDiv.innerHTML = '<div class="town-item" style="color: var(--text-muted);">None detected</div>';
    }

    // Populate missed towns list
    missedTownsDiv.innerHTML = '';
    if (missedClean.length > 0) {
      missedClean.forEach(town => {
        const item = document.createElement('div');
        item.className = 'town-item missed-item';
        item.innerHTML = `⚠ ${town}`;
        missedTownsDiv.appendChild(item);
      });
    } else {
      missedTownsDiv.innerHTML = '<div class="town-item" style="color: var(--text-muted);">None detected</div>';
    }

    // Configure main CTA generate pages link
    // Extract base business name from URL
    let bizName = 'Local Service Business';
    try {
      const hostname = new URL(targetUrl).hostname;
      bizName = hostname.replace('www.', '').split('.')[0];
      // Capitalize first letter
      bizName = bizName.charAt(0).toUpperCase() + bizName.slice(1);
    } catch(e) {}

    const generatedTownsQuery = missedClean.join(',');
    
    // Set landing page generator CTA destination
    generatePagesCta.href = `${API_BASE_URL}/generate.html?businessName=${encodeURIComponent(bizName)}&services=${encodeURIComponent(service)}&towns=${encodeURIComponent(generatedTownsQuery)}`;

    // Reset lead capture form state
    leadForm.style.display = 'flex';
    leadSuccessMsg.style.display = 'none';
  }

  // Helper: cleans page slugs back to display names
  // e.g. "plumbing-in-austin" -> "Austin"
  function cleanPageName(slug) {
    if (!slug) return '';
    // Split by -in-
    const parts = slug.split('-in-');
    let townSlug = parts[1] || parts[0];
    
    // Strip business name if appended (e.g. -apex-plumbing)
    // In free-audit, the format generated is service-in-town
    // Replace hyphens with spaces and capitalize
    return townSlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // 4. Handle Lead Capture Form
  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = leadEmailInput.value.trim();
    const url = siteUrlInput.value.trim();

    if (!email || !url) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/capture-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, url })
      });

      if (!response.ok) throw new Error('Capture email failed');

      leadForm.style.display = 'none';
      leadSuccessMsg.style.display = 'block';

    } catch (err) {
      console.error(err);
      alert('Could not submit email. Please try again.');
    }
  });

  // 5. Back Button
  backBtn.addEventListener('click', () => {
    resultsView.style.display = 'none';
    mainView.style.display = 'block';
  });
});
