document.addEventListener('DOMContentLoaded', () => {
    const gbpForm = document.getElementById('gbp-form');
    const postTypeSelect = document.getElementById('post-type');
    
    // Conditional form sections
    const sectionUpdate = document.getElementById('section-update');
    const sectionOffer = document.getElementById('section-offer');
    const sectionEvent = document.getElementById('section-event');

    // Preview elements
    const mockAvatar = document.getElementById('mock-avatar');
    const mockBizName = document.getElementById('mock-biz-name');
    const mockBizService = document.getElementById('mock-biz-service');
    const mockBizLocation = document.getElementById('mock-biz-location');
    const mockTypeTag = document.getElementById('mock-type-tag');
    const mockPostText = document.getElementById('mock-post-text');
    const mockCtaBtn = document.getElementById('mock-cta-btn');

    // Controls
    const btnGenerate = document.getElementById('btn-generate');
    const btnCopy = document.getElementById('btn-copy');
    const lockPanel = document.getElementById('lock-panel');
    const publishSectionContainer = document.getElementById('publish-section-container');

    const token = localStorage.getItem('token');

    // Date defaults for offer
    const today = new Date().toISOString().split('T')[0];
    const offerStart = document.getElementById('offer-start');
    const offerEnd = document.getElementById('offer-end');
    if (offerStart) offerStart.value = today;
    if (offerEnd) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        offerEnd.value = nextMonth.toISOString().split('T')[0];
    }

    // Toggle conditional section displays
    postTypeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        sectionUpdate.style.display = 'none';
        sectionOffer.style.display = 'none';
        sectionEvent.style.display = 'none';

        if (val === 'update') {
            sectionUpdate.style.display = 'block';
            mockTypeTag.textContent = "What's New";
        } else if (val === 'offer') {
            sectionOffer.style.display = 'block';
            mockTypeTag.textContent = "Offer";
        } else if (val === 'event') {
            sectionEvent.style.display = 'block';
            mockTypeTag.textContent = "Event";
        }
    });

    // Update business profile fields live in the mockup
    const updatePreviewHeader = () => {
        const bizNameInput = document.getElementById('biz-name').value.trim() || 'Apex Plumbing Solutions';
        const serviceInput = document.getElementById('biz-service').value.trim() || 'Plumber';
        const locationInput = document.getElementById('biz-location').value.trim() || 'Dallas, TX';

        mockBizName.innerHTML = `${bizNameInput} <i class="fas fa-check-circle gbp-verified-badge" title="Verified local listing"></i>`;
        mockBizService.textContent = serviceInput;
        mockBizLocation.textContent = locationInput;
        mockAvatar.textContent = bizNameInput.charAt(0).toUpperCase();
    };

    document.getElementById('biz-name').addEventListener('input', updatePreviewHeader);
    document.getElementById('biz-service').addEventListener('input', updatePreviewHeader);
    document.getElementById('biz-location').addEventListener('input', updatePreviewHeader);

    // Render Publish section based on Auth status
    const renderPublishSection = () => {
        if (token) {
            publishSectionContainer.innerHTML = `
                <button class="button" id="btn-publish" style="background: linear-gradient(135deg, #1a73e8, #1557b0); width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: bold; color: #fff; cursor: pointer; padding: 0.75rem 1.5rem; border-radius: 8px; border: none;">
                    <i class="fab fa-google"></i> Publish Directly to Google Maps
                </button>
            `;

            document.getElementById('btn-publish').addEventListener('click', async () => {
                const text = mockPostText.textContent;
                if (!text || text.startsWith('Generate post content') || text.startsWith('Drafting your optimized')) {
                    alert('Please generate post content first.');
                    return;
                }

                const btnPublish = document.getElementById('btn-publish');
                const originalHtml = btnPublish.innerHTML;
                btnPublish.disabled = true;
                btnPublish.innerHTML = `<span class="spinner"></span> Publishing to Google Business Profile...`;

                try {
                    const res = await fetch('/api/publish-gbp-post', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ text })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        alert(data.message || 'Successfully published to Google Business Profile!');
                        btnPublish.innerHTML = `<i class="fas fa-check-circle"></i> Successfully Published!`;
                        setTimeout(() => {
                            btnPublish.disabled = false;
                            btnPublish.innerHTML = originalHtml;
                        }, 3000);
                    } else {
                        alert(data.message || 'Failed to publish to Google Business Profile. Verify your listing is connected in Dashboard Integrations.');
                        btnPublish.disabled = false;
                        btnPublish.innerHTML = originalHtml;
                    }
                } catch (err) {
                    console.error('Publish error:', err);
                    alert('An unexpected error occurred while connecting to the publish endpoint.');
                    btnPublish.disabled = false;
                    btnPublish.innerHTML = originalHtml;
                }
            });
        } else {
            publishSectionContainer.innerHTML = `
                <div class="publish-callout-card">
                    <p style="margin: 0; color: #e2e8f0; font-size: 0.925rem; line-height: 1.5; font-weight: 500;">
                        <i class="fab fa-google" style="color: #4285f4; margin-right: 4px;"></i> 
                        <strong>Want to publish updates with one click?</strong> 
                        Connect your Google Business Profile to publish directly to search and maps.
                    </p>
                    <div style="display: flex; gap: 0.75rem;">
                        <a href="/auth.html" class="button" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem; font-weight: bold; color: #fff; text-decoration: none; text-align: center; flex: 1;">Log In</a>
                        <a href="/auth.html?signup=true" class="button" style="background: linear-gradient(135deg, #8b5cf6, #3b82f6); padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem; font-weight: bold; color: #fff; text-decoration: none; text-align: center; flex: 1.2;">Create Free Account</a>
                    </div>
                </div>
            `;
        }
    };

    renderPublishSection();

    // Check generation count limit for free tier
    const getGenerationCount = () => parseInt(localStorage.getItem('localleads_gbp_generations') || '0', 10);
    const incrementGenerationCount = () => {
        const nextCount = getGenerationCount() + 1;
        localStorage.setItem('localleads_gbp_generations', nextCount.toString());
        return nextCount;
    };

    // Form submit / generation handler
    gbpForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Check visitor limits if not logged in
        if (!token && getGenerationCount() >= 3) {
            lockPanel.style.display = 'block';
            gbpForm.style.opacity = '0.3';
            gbpForm.style.pointerEvents = 'none';
            window.scrollTo({ top: lockPanel.offsetTop - 100, behavior: 'smooth' });
            return;
        }

        const businessName = document.getElementById('biz-name').value.trim();
        const service = document.getElementById('biz-service').value.trim();
        const location = document.getElementById('biz-location').value.trim();
        const postType = postTypeSelect.value;
        const tone = document.getElementById('biz-tone').value;
        const keywords = document.getElementById('biz-keywords').value.trim();

        // Get conditional details
        let specialDetails = {};
        if (postType === 'update') {
            specialDetails.customAnnouncement = document.getElementById('announcement-text').value.trim();
        } else if (postType === 'offer') {
            specialDetails.offerTitle = document.getElementById('offer-title').value.trim();
            specialDetails.discountDetails = document.getElementById('offer-discount').value.trim();
            specialDetails.couponCode = document.getElementById('offer-code').value.trim();
            specialDetails.startDate = document.getElementById('offer-start').value;
            specialDetails.endDate = document.getElementById('offer-end').value;
        } else if (postType === 'event') {
            specialDetails.eventTitle = document.getElementById('event-title').value.trim();
            specialDetails.startDate = document.getElementById('event-start').value.trim();
            specialDetails.endDate = document.getElementById('event-end').value.trim();
        }

        // Loader state
        btnGenerate.disabled = true;
        const originalBtnText = btnGenerate.innerHTML;
        btnGenerate.innerHTML = `<span class="spinner"></span> Drafting Post Content...`;
        mockPostText.innerHTML = `Drafting your optimized local update. Emojis and hashtags are being structured...`;

        try {
            const res = await fetch('/api/generate-gbp-post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    businessName,
                    service,
                    location,
                    postType,
                    tone,
                    keywords,
                    specialDetails
                })
            });

            const data = await res.json();
            if (res.ok) {
                // Render post output
                mockPostText.textContent = data.postText;
                mockCtaBtn.textContent = data.buttonLabel;
                
                // Keep preview info in sync
                updatePreviewHeader();

                // Increment rate limit if visitor
                if (!token) {
                    const count = incrementGenerationCount();
                    if (count >= 3) {
                        setTimeout(() => {
                            lockPanel.style.display = 'block';
                            gbpForm.style.opacity = '0.3';
                            gbpForm.style.pointerEvents = 'none';
                        }, 1000);
                    }
                }
            } else {
                mockPostText.textContent = `Error: ${data.message || 'Failed to generate post.'}`;
            }
        } catch (err) {
            console.error(err);
            mockPostText.textContent = `Error connecting to generation service. Please try again.`;
        } finally {
            btnGenerate.disabled = false;
            btnGenerate.innerHTML = originalBtnText;
        }
    });

    // Copy to clipboard handler
    btnCopy.addEventListener('click', () => {
        const text = mockPostText.textContent;
        if (!text || text.startsWith('Generate post content') || text.startsWith('Drafting your optimized')) {
            alert('Please generate post content first.');
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            const originalText = btnCopy.innerHTML;
            btnCopy.innerHTML = `<i class="fas fa-check"></i> Copied to Clipboard!`;
            setTimeout(() => {
                btnCopy.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Clipboard copy error:', err);
            alert('Failed to copy to clipboard. Select the text and copy manually.');
        });
    });
});
