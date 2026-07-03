document.addEventListener('DOMContentLoaded', () => {
    const citationForm = document.getElementById('citation-form');
    const btnScan = document.getElementById('btn-scan');
    const loadingPanel = document.getElementById('loading-panel');
    const resultsPanel = document.getElementById('results-panel');
    const errorMessage = document.getElementById('error-message');
    const leadForm = document.getElementById('lead-form');
    const lockPanel = document.getElementById('lock-panel');

    let scanData = null;

    // Loading steps
    const stepGeocode = document.getElementById('step-geocode');
    const stepOsm = document.getElementById('step-osm');
    const stepGoogle = document.getElementById('step-google');
    const stepYelp = document.getElementById('step-yelp');
    const stepFacebook = document.getElementById('step-facebook');
    const stepOther = document.getElementById('step-other');

    const steps = [
        { el: stepGeocode, delay: 700 },
        { el: stepOsm, delay: 700 },
        { el: stepGoogle, delay: 800 },
        { el: stepYelp, delay: 800 },
        { el: stepFacebook, delay: 800 },
        { el: stepOther, delay: 800 }
    ];

    if (citationForm) {
        citationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('biz-name').value.trim();
            const phone = document.getElementById('biz-phone').value.trim();
            const address = document.getElementById('biz-address').value.trim();

            if (!name || !phone || !address) {
                showError('Please fill out all fields.');
                return;
            }

            // Reset panels
            errorMessage.style.display = 'none';
            citationForm.style.display = 'none';
            loadingPanel.style.display = 'flex';
            resultsPanel.style.display = 'none';

            // Reset loading steps classes
            steps.forEach(step => {
                step.el.className = 'loading-step';
                const icon = step.el.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-circle-notch';
                }
            });

            // Start API call
            const apiPromise = fetch('/api/citation-scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, address, phone })
            });

            // Start loading simulation in parallel
            let simulationPromise = new Promise(async (resolve) => {
                for (let i = 0; i < steps.length; i++) {
                    const current = steps[i];
                    current.el.classList.add('active');
                    const currentIcon = current.el.querySelector('i');
                    if (currentIcon) {
                        currentIcon.className = 'fas fa-spinner';
                    }

                    await new Promise(r => setTimeout(r, current.delay));

                    current.el.classList.remove('active');
                    current.el.classList.add('completed');
                    if (currentIcon) {
                        currentIcon.className = 'fas fa-check-circle';
                    }
                }
                resolve();
            });

            try {
                // Wait for both the API call and the visual steps to complete
                const [response] = await Promise.all([apiPromise, simulationPromise]);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to complete citation scan.');
                }

                const data = await response.json();
                scanData = data;

                // Show lead lock panel instead of rendering results immediately
                loadingPanel.style.display = 'none';
                const lockBizName = document.getElementById('lock-biz-name');
                if (lockBizName) {
                    lockBizName.textContent = name;
                }
                if (lockPanel) {
                    lockPanel.style.display = 'block';
                }

            } catch (err) {
                console.error(err);
                showError(err.message || 'An error occurred while scanning. Please try again.');
                loadingPanel.style.display = 'none';
                citationForm.style.display = 'block';
            }
        });
    }

    function showError(msg) {
        if (errorMessage) {
            errorMessage.textContent = msg;
            errorMessage.style.display = 'block';
        }
    }

    function renderResults(data) {
        loadingPanel.style.display = 'none';
        resultsPanel.style.display = 'block';

        const { score, scanResults, suggestedTowns, generatedRedirectUrl } = data;

        // Circular progress score
        const scoreCircle = document.getElementById('score-circle');
        const scoreText = document.getElementById('score-text');
        const scoreGrade = document.getElementById('score-grade');
        const scoreSummary = document.getElementById('score-summary');

        if (scoreText) scoreText.textContent = `${score}%`;

        if (scoreCircle) {
            const radius = scoreCircle.r.baseVal.value;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (score / 100) * circumference;
            scoreCircle.style.strokeDasharray = `${circumference}`;
            scoreCircle.style.strokeDashoffset = offset;

            // Change color depending on score
            if (score >= 90) {
                scoreCircle.style.stroke = '#10b981'; // Green
                if (scoreGrade) scoreGrade.textContent = 'Excellent NAP Health';
                if (scoreGrade) scoreGrade.style.color = '#34d399';
                if (scoreSummary) scoreSummary.textContent = 'Fantastic consistency! Your Name, Address, and Phone details are almost perfectly aligned across top directories, establishing strong local search trust.';
            } else if (score >= 70) {
                scoreCircle.style.stroke = '#fbbf24'; // Yellow
                if (scoreGrade) scoreGrade.textContent = 'Moderate NAP Health';
                if (scoreGrade) scoreGrade.style.color = '#fbbf24';
                if (scoreSummary) scoreSummary.textContent = 'Some inconsistencies found. Search engines may have trouble verifying your business coordinates, which can slightly suppress local rankings.';
            } else {
                scoreCircle.style.stroke = '#ef4444'; // Red
                if (scoreGrade) scoreGrade.textContent = 'Needs Critical Attention';
                if (scoreGrade) scoreGrade.style.color = '#f87171';
                if (scoreSummary) scoreSummary.textContent = 'High level of NAP discrepancies detected. Direct directory conflicts and missing listings are hurting your local map placements and search presence.';
            }
        }

        // Render cards
        const directoryGrid = document.getElementById('directory-grid');
        if (directoryGrid) {
            directoryGrid.innerHTML = '';
            
            scanResults.forEach(res => {
                const card = document.createElement('div');
                card.className = 'directory-card';

                let badgeClass = 'badge-consistent';
                if (res.status === 'Mismatched') badgeClass = 'badge-mismatched';
                if (res.status === 'Missing') badgeClass = 'badge-missing';

                let iconHtml = '<i class="fas fa-check-circle" style="color: #10b981;"></i>';
                if (res.status === 'Mismatched') {
                    iconHtml = '<i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>';
                    card.style.borderColor = 'rgba(245, 158, 11, 0.25)';
                } else if (res.status === 'Missing') {
                    iconHtml = '<i class="fas fa-times-circle" style="color: #ef4444;"></i>';
                    card.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                } else {
                    card.style.borderColor = 'rgba(16, 185, 129, 0.25)';
                }

                card.innerHTML = `
                    <div class="directory-header">
                        <span class="directory-name">${iconHtml} ${res.directory}</span>
                        <span class="badge ${badgeClass}">${res.status}</span>
                    </div>
                    <div class="directory-details">${res.details}</div>
                `;
                directoryGrid.appendChild(card);
            });
        }

        // Suggested towns tags
        const suggestedTownsContainer = document.getElementById('suggested-towns');
        if (suggestedTownsContainer) {
            suggestedTownsContainer.innerHTML = '';
            suggestedTowns.forEach(town => {
                const tag = document.createElement('span');
                tag.className = 'town-tag';
                tag.textContent = town;
                suggestedTownsContainer.appendChild(tag);
            });
        }

        // Redirect URL update
        const ctaRedirect = document.getElementById('cta-redirect');
        if (ctaRedirect) {
            ctaRedirect.href = generatedRedirectUrl;
        }
    }

    if (leadForm) {
        leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('lead-name').value.trim();
            const email = document.getElementById('lead-email').value.trim();

            const submitBtn = leadForm.querySelector('button[type="submit"]');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Unlocking Report... <i class="fas fa-spinner fa-spin"></i>';

            const bizName = document.getElementById('biz-name').value.trim();
            const bizPhone = document.getElementById('biz-phone').value.trim();
            const bizAddress = document.getElementById('biz-address').value.trim();

            try {
                await fetch('/api/capture-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        url: window.location.origin,
                        phone: bizPhone,
                        source: 'citation-scanner',
                        message: `NAP Consistency Scan for business: ${bizName}. Address: ${bizAddress}. Phone: ${bizPhone}.`
                    })
                });
            } catch (err) {
                console.error('Error capturing lead:', err);
            }

            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;

            if (lockPanel) {
                lockPanel.style.display = 'none';
            }
            if (scanData) {
                renderResults(scanData);
            }
        });
    }
});
