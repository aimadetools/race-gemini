document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Inputs
    const bizNameInput = document.getElementById('biz-name');
    const currentRatingSlider = document.getElementById('current-rating');
    const currentRatingVal = document.getElementById('current-rating-val');
    const currentReviewsInput = document.getElementById('current-reviews');
    const targetRatingSelect = document.getElementById('target-rating');
    
    // DOM Elements - Instant Outputs
    const ratingStatusBadge = document.getElementById('rating-status');
    const reviewsNeededVal = document.getElementById('reviews-needed-val');
    const newTotalVal = document.getElementById('new-total-val');
    
    // DOM Elements - Panels
    const lockPanel = document.getElementById('lock-panel');
    const lockBizName = document.getElementById('lock-biz-name');
    const resultsUnlocked = document.getElementById('results-unlocked');
    const leadForm = document.getElementById('lead-form');
    const leadNameInput = document.getElementById('lead-name');
    const leadEmailInput = document.getElementById('lead-email');
    const calculateBtn = document.getElementById('calculate-btn');
    
    // DOM Elements - Adjusters (Unlocked)
    const weeklyAsksSlider = document.getElementById('weekly-asks');
    const weeklyAsksVal = document.getElementById('weekly-asks-val');
    const conversionRateSlider = document.getElementById('conversion-rate');
    const conversionRateVal = document.getElementById('conversion-rate-val');
    const weeksNeededDisplay = document.getElementById('weeks-needed-val');
    const rateSummaryDisplay = document.getElementById('rate-summary');
    const finalWeeksCard = document.getElementById('final-weeks-card');
    
    // Promo links
    const promoLinkGen = document.getElementById('promo-link-gen');
    const promoFlyer = document.getElementById('promo-flyer');
    
    // State variables
    let isUnlocked = false;
    let reviewsNeeded = 0;
    
    // Helper: calculate reviews needed to hit rating
    function calculateReviews(currentRating, currentReviews, targetRating) {
        if (targetRating <= currentRating) return 0;
        
        let rawNeeded;
        if (targetRating >= 5.0) {
            // Google rounds ratings to nearest 0.1, so a 4.95 rounds up to 5.0
            const tCalc = 4.95;
            if (currentRating >= tCalc) return 0;
            rawNeeded = currentReviews * (tCalc - currentRating) / (5.0 - tCalc);
        } else {
            rawNeeded = currentReviews * (targetRating - currentRating) / (5.0 - targetRating);
        }
        return Math.ceil(Math.round(rawNeeded * 1e9) / 1e9);
    }
    
    // Live Calculation Updates
    function updateInstantMetrics() {
        const currentRating = parseFloat(currentRatingSlider.value);
        const currentReviews = parseInt(currentReviewsInput.value) || 0;
        const targetRating = parseFloat(targetRatingSelect.value);
        const bizName = bizNameInput.value.trim() || 'your business';
        
        // 1. Update Rating status badge
        if (currentRating < 4.0) {
            ratingStatusBadge.className = 'badge-rating badge-critical';
            ratingStatusBadge.innerHTML = '<i class="fas fa-exclamation-circle"></i> Critical';
        } else if (currentRating < 4.5) {
            ratingStatusBadge.className = 'badge-rating badge-fair';
            ratingStatusBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Fair';
        } else {
            ratingStatusBadge.className = 'badge-rating badge-good';
            ratingStatusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Good';
        }
        
        // 2. Compute reviews needed
        reviewsNeeded = calculateReviews(currentRating, currentReviews, targetRating);
        reviewsNeededVal.textContent = reviewsNeeded;
        newTotalVal.textContent = currentReviews + reviewsNeeded;
        
        // 3. Update lock overlay text & promo links
        lockBizName.textContent = bizName;
        
        const encodedBizName = encodeURIComponent(bizName);
        promoLinkGen.href = `/review-link-generator.html?biz_name=${encodedBizName}`;
        promoFlyer.href = `/review-flyer.html?biz_name=${encodedBizName}`;
        
        // Update print-only summary and headers
        const printBizName = document.getElementById('print-biz-name-display');
        if (printBizName) {
            printBizName.textContent = `Business Name: ${bizName}`;
        }
        const printSumName = document.getElementById('print-summary-biz-name');
        if (printSumName) printSumName.textContent = bizName;
        const printSumRating = document.getElementById('print-summary-current-rating');
        if (printSumRating) printSumRating.textContent = `${currentRating} ★`;
        const printSumReviews = document.getElementById('print-summary-current-reviews');
        if (printSumReviews) printSumReviews.textContent = currentReviews;
        const printSumTarget = document.getElementById('print-summary-target-rating');
        if (printSumTarget) printSumTarget.textContent = `${targetRating} ★`;
        
        // 4. If already unlocked, update schedules
        if (isUnlocked) {
            updateSchedulePlan();
        }
    }
    
    // Schedule Calculations (Adjusters Panel)
    function updateSchedulePlan() {
        const weeklyAsks = parseInt(weeklyAsksSlider.value);
        const responseRate = parseInt(conversionRateSlider.value);
        
        const reviewsPerWeek = weeklyAsks * (responseRate / 100);
        rateSummaryDisplay.textContent = `Generating ${reviewsPerWeek.toFixed(1)} new reviews per week.`;
        
        if (reviewsNeeded <= 0) {
            weeksNeededDisplay.textContent = '0 Weeks';
            if (finalWeeksCard) finalWeeksCard.style.display = 'none';
            return;
        }
        
        const weeksNeeded = Math.ceil(reviewsNeeded / reviewsPerWeek);
        weeksNeededDisplay.textContent = `${weeksNeeded} ${weeksNeeded === 1 ? 'Week' : 'Weeks'}`;
        
        // Update final week card text dynamically
        if (finalWeeksCard) {
            if (weeksNeeded <= 4) {
                finalWeeksCard.style.display = 'none';
            } else {
                finalWeeksCard.style.display = 'block';
                const titleNode = finalWeeksCard.querySelector('.weekly-title');
                if (titleNode) {
                    titleNode.textContent = `Weeks 5 - ${weeksNeeded}: Scale Outreach`;
                }
            }
        }
    }
    
    // Event listeners
    currentRatingSlider.addEventListener('input', () => {
        currentRatingVal.textContent = `${parseFloat(currentRatingSlider.value).toFixed(1)} ★`;
        updateInstantMetrics();
    });
    
    currentReviewsInput.addEventListener('input', updateInstantMetrics);
    targetRatingSelect.addEventListener('change', updateInstantMetrics);
    bizNameInput.addEventListener('input', updateInstantMetrics);
    
    // Calculation action button
    calculateBtn.addEventListener('click', () => {
        if (!bizNameInput.value.trim()) {
            bizNameInput.focus();
            bizNameInput.style.borderColor = '#ef4444';
            setTimeout(() => bizNameInput.style.borderColor = '', 2000);
            return;
        }
        
        if (!isUnlocked) {
            lockPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Pulse the lead form to draw attention
            lockPanel.style.transform = 'scale(1.02)';
            setTimeout(() => lockPanel.style.transform = '', 200);
        } else {
            resultsUnlocked.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
    
    // Lead Submission & Unlock Plan
    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const bizName = bizNameInput.value.trim();
        const contactName = leadNameInput.value.trim();
        const contactEmail = leadEmailInput.value.trim();
        
        const submitBtn = document.getElementById('unlock-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unlocking...';
        
        const currentRating = parseFloat(currentRatingSlider.value);
        const currentReviews = parseInt(currentReviewsInput.value) || 0;
        const targetRating = parseFloat(targetRatingSelect.value);
        
        const messageText = `Calculated: ${reviewsNeeded} 5-star reviews needed to reach ${targetRating}★ from ${currentRating}★ (Total: ${currentReviews} reviews).`;
        
        try {
            const response = await fetch('/api/capture-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: contactEmail,
                    name: contactName,
                    url: window.location.href,
                    source: 'review-calculator',
                    message: messageText
                })
            });
            
            // Proceed regardless of API status (unlocks UI as fallback)
            isUnlocked = true;
            lockPanel.style.display = 'none';
            resultsUnlocked.style.display = 'block';
            updateSchedulePlan();
            resultsUnlocked.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            console.error('Lead capture error:', err);
            // Fallback unlock to not break UX
            isUnlocked = true;
            lockPanel.style.display = 'none';
            resultsUnlocked.style.display = 'block';
            updateSchedulePlan();
            resultsUnlocked.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
    
    // Sliders event listeners (unlocked panel)
    weeklyAsksSlider.addEventListener('input', () => {
        weeklyAsksVal.textContent = `${weeklyAsksSlider.value} / week`;
        updateSchedulePlan();
    });
    
    conversionRateSlider.addEventListener('input', () => {
        conversionRateVal.textContent = `${conversionRateSlider.value}%`;
        updateSchedulePlan();
    });
    
    // Clipboard copy functionality for templates
    const templates = [
        { btnId: 'copy-sms-btn', elementId: 'template-sms', label: 'SMS' },
        { btnId: 'copy-email-btn', elementId: 'template-email', label: 'Email' }
    ];
    
    // Create copy buttons dynamically inside template boxes
    document.querySelectorAll('.template-box').forEach((box) => {
        const id = box.id;
        const btn = document.createElement('button');
        btn.className = 'copy-tag';
        btn.innerHTML = '<i class="far fa-copy"></i> Copy';
        btn.addEventListener('click', () => {
            const text = box.textContent.replace('Copy', '').trim();
            navigator.clipboard.writeText(text).then(() => {
                btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                btn.style.color = '#34d399';
                setTimeout(() => {
                    btn.innerHTML = '<i class="far fa-copy"></i> Copy';
                    btn.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
        box.appendChild(btn);
    });
    
    // Print PDF button listener
    const downloadPlanPdfBtn = document.getElementById('download-plan-pdf-btn');
    if (downloadPlanPdfBtn) {
        downloadPlanPdfBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    // Initial runs
    updateInstantMetrics();
});
