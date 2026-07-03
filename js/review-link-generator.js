document.addEventListener('DOMContentLoaded', () => {
    const generatorForm = document.getElementById('generator-form');
    const leadForm = document.getElementById('lead-form');
    const inputPanel = document.getElementById('input-panel');
    const loadingPanel = document.getElementById('loading-panel');
    const lockPanel = document.getElementById('lock-panel');
    const resultsPanel = document.getElementById('results-panel');

    const stepGeolocate = document.getElementById('step-geolocate');
    const stepReviewLink = document.getElementById('step-review-link');
    const stepQrGen = document.getElementById('step-qr-gen');

    const lockBizName = document.getElementById('lock-biz-name');
    const finalReviewUrl = document.getElementById('final-review-url');
    const resultQrImg = document.getElementById('result-qr-img');
    const mockupQrImg = document.getElementById('mockup-qr-img');
    const mockupBizName = document.getElementById('mockup-biz-name');
    const flyerPromoLink = document.getElementById('flyer-promo-link');

    const copyUrlBtn = document.getElementById('copy-url-btn');
    const downloadQrBtn = document.getElementById('download-qr-btn');

    let businessNameVal = '';
    let businessAddressVal = '';
    let customUrlVal = '';
    let generatedReviewUrl = '';

    // Handle initial generation submission
    if (generatorForm) {
        generatorForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            businessNameVal = document.getElementById('biz-name').value.trim();
            businessAddressVal = document.getElementById('biz-address').value.trim();
            customUrlVal = document.getElementById('custom-review-url').value.trim();

            if (!businessNameVal || !businessAddressVal) return;

            // Transition to loading panel
            inputPanel.style.display = 'none';
            loadingPanel.style.display = 'block';

            // Sequential animation delays
            try {
                // Step 1: Geolocate
                stepGeolocate.classList.add('active');
                await delay(1000);
                stepGeolocate.classList.remove('active');
                stepGeolocate.classList.add('completed');
                stepGeolocate.querySelector('i').className = 'fas fa-check';

                // Step 2: Format write-review redirect
                stepReviewLink.classList.add('active');
                await delay(1000);
                stepReviewLink.classList.remove('active');
                stepReviewLink.classList.add('completed');
                stepReviewLink.querySelector('i').className = 'fas fa-check';

                // Step 3: QR Code generation
                stepQrGen.classList.add('active');
                await delay(800);
                stepQrGen.classList.remove('active');
                stepQrGen.classList.add('completed');
                stepQrGen.querySelector('i').className = 'fas fa-check';

                await delay(400);

                // Show lock panel
                loadingPanel.style.display = 'none';
                if (lockBizName) {
                    lockBizName.textContent = businessNameVal;
                }
                lockPanel.style.display = 'block';

            } catch (err) {
                console.error('Error during generation loading sequence:', err);
                // Fallback to lock panel anyway
                loadingPanel.style.display = 'none';
                lockPanel.style.display = 'block';
            }
        });
    }

    // Handle lead capture submission
    if (leadForm) {
        leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const leadNameVal = document.getElementById('lead-name').value.trim();
            const leadEmailVal = document.getElementById('lead-email').value.trim();

            const unlockSubmitBtn = document.getElementById('unlock-submit-btn');
            const originalHTML = unlockSubmitBtn.innerHTML;
            unlockSubmitBtn.disabled = true;
            unlockSubmitBtn.innerHTML = 'Unlocking Review Assets... <i class="fas fa-spinner fa-spin"></i>';

            // Capture the lead email using /api/capture-email
            try {
                await fetch('/api/capture-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: leadNameVal,
                        email: leadEmailVal,
                        url: window.location.origin,
                        source: 'review-link-generator',
                        message: `Google Review Link generated for business: ${businessNameVal}. Location: ${businessAddressVal}.`
                    })
                });
            } catch (err) {
                console.error('Error capturing lead:', err);
            }

            unlockSubmitBtn.disabled = false;
            unlockSubmitBtn.innerHTML = originalHTML;

            // Generate review url
            if (customUrlVal) {
                generatedReviewUrl = customUrlVal;
            } else {
                generatedReviewUrl = `https://search.google.com/local/writereview?query=${encodeURIComponent(businessNameVal + ' ' + businessAddressVal)}`;
            }

            const qrApiUrl = `https://api.qrcode-server.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generatedReviewUrl)}`;

            // Update UI elements in results panel
            if (finalReviewUrl) {
                finalReviewUrl.textContent = generatedReviewUrl;
            }
            if (resultQrImg) {
                resultQrImg.src = qrApiUrl;
            }
            if (mockupQrImg) {
                mockupQrImg.src = qrApiUrl;
            }
            if (mockupBizName) {
                mockupBizName.textContent = businessNameVal;
            }
            if (flyerPromoLink) {
                flyerPromoLink.href = `/review-flyer.html?businessName=${encodeURIComponent(businessNameVal)}&reviewUrl=${encodeURIComponent(generatedReviewUrl)}`;
            }

            // Show results
            lockPanel.style.display = 'none';
            resultsPanel.style.display = 'block';
        });
    }

    // Helper delay function
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Copy Link functionality
    if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', () => {
            if (!generatedReviewUrl) return;

            navigator.clipboard.writeText(generatedReviewUrl).then(() => {
                const originalText = copyUrlBtn.innerHTML;
                copyUrlBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    copyUrlBtn.innerHTML = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy to clipboard:', err);
            });
        });
    }

    // Download QR Code image
    if (downloadQrBtn) {
        downloadQrBtn.addEventListener('click', async () => {
            if (!generatedReviewUrl) return;

            const qrApiUrl = `https://api.qrcode-server.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(generatedReviewUrl)}`;

            try {
                // Fetch image blob to bypass cross-origin restrictions on download attribute
                const response = await fetch(qrApiUrl);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);

                const downloadLink = document.createElement('a');
                downloadLink.href = blobUrl;
                downloadLink.download = `${slugify(businessNameVal)}-google-review-qr.png`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(blobUrl);
            } catch (err) {
                console.error('Failed to download QR code image, opening in new tab:', err);
                window.open(qrApiUrl, '_blank');
            }
        });
    }

    // Helper slugify function
    function slugify(text) {
        return text
            .toString()
            .toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start
            .replace(/-+$/, '');            // Trim - from end
    }
});
