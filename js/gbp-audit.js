document.addEventListener('DOMContentLoaded', () => {
    const auditForm = document.getElementById('audit-form');
    const btnRunAudit = document.getElementById('btn-run-audit');
    const auditFormPanel = document.getElementById('audit-form-panel');
    const loadingPanel = document.getElementById('loading-panel');
    const lockPanel = document.getElementById('lock-panel');
    const auditDashboard = document.getElementById('audit-dashboard');
    const leadForm = document.getElementById('lead-form');
    const btnDashboardImport = document.getElementById('btn-dashboard-import');

    const stepRetrieve = document.getElementById('step-retrieve');
    const stepNap = document.getElementById('step- NAP');
    const stepCompleteness = document.getElementById('step-completeness');
    const stepAi = document.getElementById('step-ai');

    let auditResult = null;
    const jwtToken = localStorage.getItem('token');
    const isAuthenticated = !!jwtToken;

    // Show import button if authenticated
    if (isAuthenticated && btnDashboardImport) {
        btnDashboardImport.style.display = 'inline-flex';
        btnDashboardImport.addEventListener('click', async () => {
            btnDashboardImport.disabled = true;
            const originalHtml = btnDashboardImport.innerHTML;
            btnDashboardImport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';

            try {
                const response = await fetch('/api/business-profile', {
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.profile) {
                        const p = data.profile;
                        document.getElementById('biz-name').value = p.name || '';
                        document.getElementById('biz-category').value = p.type || 'LocalBusiness';
                        if (p.address) {
                            document.getElementById('biz-address').value = [
                                p.address.streetAddress,
                                p.address.addressLocality,
                                p.address.addressRegion,
                                p.address.postalCode
                            ].filter(Boolean).join(', ');
                        }
                        document.getElementById('biz-phone').value = p.phone || '';
                        document.getElementById('biz-website').value = p.website || '';
                        document.getElementById('biz-description').value = p.description || '';
                        alert('Your saved business profile details have been imported into the form.');
                    } else {
                        alert('No saved business profile found. Please fill out the form.');
                    }
                } else {
                    alert('Failed to load saved profile.');
                }
            } catch (err) {
                console.error('Error importing profile:', err);
                alert('A network error occurred.');
            } finally {
                btnDashboardImport.disabled = false;
                btnDashboardImport.innerHTML = originalHtml;
            }
        });
    }

    // Form Submission
    if (auditForm) {
        auditForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('biz-name').value.trim();
            const category = document.getElementById('biz-category').value;
            const address = document.getElementById('biz-address').value.trim();
            const phone = document.getElementById('biz-phone').value.trim();
            const website = document.getElementById('biz-website').value.trim();
            const description = document.getElementById('biz-description').value.trim();

            auditFormPanel.style.display = 'none';
            loadingPanel.style.display = 'block';

            // Reset loading steps classes
            const steps = [
                { el: stepRetrieve, delay: 800 },
                { el: stepNap, delay: 800 },
                { el: stepCompleteness, delay: 800 },
                { el: stepAi, delay: 1000 }
            ];

            steps.forEach(step => {
                if (step.el) {
                    step.el.className = 'loading-step';
                    const icon = step.el.querySelector('i');
                    if (icon) icon.className = 'fas fa-circle-notch';
                }
            });

            // Start API call in parallel
            const requestBody = {
                isMock: !isAuthenticated,
                name,
                category,
                address,
                phone,
                website,
                description
            };

            const headers = { 'Content-Type': 'application/json' };
            if (isAuthenticated) {
                headers['Authorization'] = `Bearer ${jwtToken}`;
            }

            const apiPromise = fetch('/api/gbp-audit', {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });

            // Start step animation simulation
            const simulationPromise = new Promise(async (resolve) => {
                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];
                    if (!step.el) continue;

                    step.el.classList.add('active');
                    const icon = step.el.querySelector('i');
                    if (icon) icon.className = 'fas fa-spinner';

                    await new Promise(r => setTimeout(r, step.delay));

                    step.el.classList.remove('active');
                    step.el.classList.add('completed');
                    if (icon) icon.className = 'fas fa-check-circle';
                }
                resolve();
            });

            try {
                const [response] = await Promise.all([apiPromise, simulationPromise]);
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.message || 'Failed to analyze profile.');
                }

                auditResult = await response.json();

                loadingPanel.style.display = 'none';

                // Lead lock or Dashboard
                const hasUnlockedBefore = localStorage.getItem('gbp_audit_unlocked') === 'true';
                if (isAuthenticated || hasUnlockedBefore) {
                    renderDashboard();
                } else {
                    lockPanel.style.display = 'block';
                }

            } catch (err) {
                console.error('Audit failed:', err);
                alert(err.message || 'An unexpected error occurred. Please try again.');
                loadingPanel.style.display = 'none';
                auditFormPanel.style.display = 'block';
            }
        });
    }

    // Lead Form Submission
    if (leadForm) {
        leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('lead-name').value.trim();
            const email = document.getElementById('lead-email').value.trim();
            const submitBtn = leadForm.querySelector('button[type="submit"]');

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Unlocking... <i class="fas fa-spinner fa-spin"></i>';

            try {
                const response = await fetch('/api/capture-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        name,
                        url: window.location.href,
                        source: 'gbp-audit'
                    })
                });

                if (response.ok) {
                    localStorage.setItem('gbp_audit_unlocked', 'true');
                    lockPanel.style.display = 'none';
                    renderDashboard();
                } else {
                    const data = await response.json();
                    alert(data.message || 'Failed to submit details.');
                }
            } catch (err) {
                console.error('Lead capture error:', err);
                alert('A network error occurred.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Unlock Audit Results <i class="fas fa-arrow-right"></i>';
            }
        });
    }

    // Dashboard rendering
    function renderDashboard() {
        if (!auditResult) return;

        auditDashboard.style.display = 'grid';

        // Score Gauge
        const score = auditResult.score || 0;
        const scoreCircle = document.getElementById('dash-score-circle');
        const scoreText = document.getElementById('dash-score-text');
        const scoreMsg = document.getElementById('dash-score-message');

        if (scoreCircle) {
            const offset = 440 - (440 * score) / 100;
            scoreCircle.style.strokeDashoffset = offset;
        }
        if (scoreText) {
            scoreText.textContent = `${score}%`;
        }
        if (scoreMsg) {
            if (score >= 90) {
                scoreMsg.textContent = 'Excellent! Your profile matches top local ranking factors.';
                scoreMsg.style.color = '#34d399';
            } else if (score >= 70) {
                scoreMsg.textContent = 'Good. Resolve the warnings below to further improve map visibility.';
                scoreMsg.style.color = '#fbbf24';
            } else {
                scoreMsg.textContent = 'Critical optimization gaps found. Action highly recommended.';
                scoreMsg.style.color = '#f87171';
            }
        }

        // Checks checklist
        const checksContainer = document.getElementById('dash-checks-container');
        if (checksContainer && auditResult.checks) {
            checksContainer.innerHTML = '';
            auditResult.checks.forEach(check => {
                const item = document.createElement('div');
                item.className = 'check-item';
                
                let badgeClass = 'badge-failed';
                let iconClass = 'fa-times-circle text-red-500';
                if (check.status === 'passed') {
                    badgeClass = 'badge-passed';
                    iconClass = 'fa-check-circle text-green-500';
                } else if (check.status === 'warning') {
                    badgeClass = 'badge-warning';
                    iconClass = 'fa-exclamation-circle text-yellow-500';
                }

                item.innerHTML = `
                    <div style="font-size: 1.15rem; margin-top: 2px;">
                        <i class="fas ${iconClass.includes('check') ? 'fa-check-circle' : iconClass.includes('exclamation') ? 'fa-exclamation-circle' : 'fa-times-circle'}" style="color: ${check.status === 'passed' ? '#34d399' : check.status === 'warning' ? '#fbbf24' : '#f87171'}"></i>
                    </div>
                    <div style="flex-grow: 1;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                            <strong style="color: #fff; font-size: 0.95rem;">${check.title}</strong>
                            <span class="check-badge ${badgeClass}">${check.status}</span>
                        </div>
                        <p style="margin: 0; color: #9ca3af; font-size: 0.85rem; line-height: 1.4;">${check.message}</p>
                    </div>
                `;
                checksContainer.appendChild(item);
            });
        }

        // AI Recommendations
        const rec = auditResult.recommendations;
        if (rec) {
            // Optimized Description
            const optDescBox = document.getElementById('dash-opt-desc');
            const descCharCount = document.getElementById('dash-desc-char-count');
            if (optDescBox) {
                optDescBox.textContent = rec.optimizedDescription || '';
                if (descCharCount) {
                    descCharCount.textContent = `${(rec.optimizedDescription || '').length} / 750 characters`;
                }
            }

            // Save Description to profile button (authenticated only)
            const btnSaveDesc = document.getElementById('btn-save-desc');
            if (isAuthenticated && btnSaveDesc) {
                btnSaveDesc.style.display = 'inline-flex';
                btnSaveDesc.addEventListener('click', async () => {
                    btnSaveDesc.disabled = true;
                    btnSaveDesc.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                    try {
                        const response = await fetch('/api/business-profile', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${jwtToken}`
                            },
                            body: JSON.stringify({
                                name: auditResult.profile.name,
                                type: auditResult.profile.category,
                                phone: auditResult.profile.phone,
                                website: auditResult.profile.website,
                                description: rec.optimizedDescription
                            })
                        });

                        if (response.ok) {
                            alert('Optimized description saved successfully to your LocalLeads business profile!');
                        } else {
                            const data = await response.json();
                            alert(data.message || 'Failed to save description.');
                        }
                    } catch (err) {
                        console.error('Error saving description:', err);
                        alert('A network error occurred.');
                    } finally {
                        btnSaveDesc.disabled = false;
                        btnSaveDesc.innerHTML = '<i class="fas fa-save"></i> Save to Profile';
                    }
                });
            }

            // Copy Description Button
            const btnCopyDesc = document.getElementById('btn-copy-desc');
            if (btnCopyDesc) {
                btnCopyDesc.addEventListener('click', () => {
                    navigator.clipboard.writeText(rec.optimizedDescription || '').then(() => {
                        const originalText = btnCopyDesc.innerHTML;
                        btnCopyDesc.innerHTML = '<i class="fas fa-check" style="color: #34d399"></i> Copied!';
                        setTimeout(() => btnCopyDesc.innerHTML = originalText, 2000);
                    });
                });
            }

            // Keywords
            const kwContainer = document.getElementById('dash-keywords-container');
            if (kwContainer && rec.keywords) {
                kwContainer.innerHTML = '';
                rec.keywords.forEach(kw => {
                    const tag = document.createElement('div');
                    tag.className = 'kw-tag';
                    tag.innerHTML = `
                        <span>${kw}</span>
                        <button class="copy-btn" title="Copy Keyword">
                            <i class="far fa-copy"></i>
                        </button>
                    `;
                    const copyBtn = tag.querySelector('.copy-btn');
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(kw).then(() => {
                            const icon = copyBtn.querySelector('i');
                            icon.className = 'fas fa-check';
                            icon.style.color = '#34d399';
                            setTimeout(() => {
                                icon.className = 'far fa-copy';
                                icon.style.color = '';
                            }, 2000);
                        });
                    });
                    kwContainer.appendChild(tag);
                });
            }

            // Posts
            const postsContainer = document.getElementById('dash-posts-container');
            if (postsContainer && rec.posts) {
                postsContainer.innerHTML = '';
                rec.posts.forEach((post, index) => {
                    const card = document.createElement('div');
                    card.style.cssText = 'background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; text-align: left;';
                    
                    let actionHtml = '';
                    if (isAuthenticated && auditResult.gbpConnected) {
                        actionHtml = `
                            <button class="btn-primary btn-publish-gmb" style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600;" data-index="${index}">
                                <i class="fas fa-paper-plane"></i> Publish to Google
                            </button>
                        `;
                    }

                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <strong style="color: #fff; font-size: 0.9rem;">${post.title || `Option ${index + 1}`}</strong>
                            <div style="display: flex; gap: 6px; align-items: center;">
                                ${actionHtml}
                                <button class="btn-secondary btn-copy-post" style="padding: 4px 8px; font-size: 0.75rem;">
                                    <i class="fas fa-copy"></i> Copy
                                </button>
                            </div>
                        </div>
                        <p style="margin: 0; color: #9ca3af; font-size: 0.88rem; line-height: 1.4;" class="post-text">${post.text}</p>
                    `;

                    // Copy post event
                    const copyBtn = card.querySelector('.btn-copy-post');
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(post.text).then(() => {
                            const originalText = copyBtn.innerHTML;
                            copyBtn.innerHTML = '<i class="fas fa-check" style="color: #34d399"></i> Copied!';
                            setTimeout(() => copyBtn.innerHTML = originalText, 2000);
                        });
                    });

                    // Publish post event
                    const publishBtn = card.querySelector('.btn-publish-gmb');
                    if (publishBtn) {
                        publishBtn.addEventListener('click', async () => {
                            publishBtn.disabled = true;
                            const originalText = publishBtn.innerHTML;
                            publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';

                            try {
                                const response = await fetch('/api/publish-gbp-post', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${jwtToken}`
                                    },
                                    body: JSON.stringify({
                                        text: post.text
                                    })
                                });

                                if (response.ok) {
                                    alert('Successfully published update directly to your Google Business Profile listing!');
                                    publishBtn.innerHTML = '<i class="fas fa-check-circle" style="color: #34d399"></i> Published';
                                } else {
                                    const data = await response.json();
                                    alert(data.message || 'Failed to publish post.');
                                    publishBtn.disabled = false;
                                    publishBtn.innerHTML = originalText;
                                }
                            } catch (err) {
                                console.error('Error publishing post:', err);
                                alert('Network error occurred.');
                                publishBtn.disabled = false;
                                publishBtn.innerHTML = originalText;
                            }
                        });
                    }

                    postsContainer.appendChild(card);
                });
            }

            // FAQs
            const faqsContainer = document.getElementById('dash-faqs-container');
            if (faqsContainer && rec.faqs) {
                faqsContainer.innerHTML = '';
                rec.faqs.forEach((faq, index) => {
                    const card = document.createElement('div');
                    card.style.cssText = 'background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px; text-align: left;';
                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem; gap: 8px;">
                            <strong style="color: #fff; font-size: 0.9rem; line-height: 1.4;">Q: ${faq.question}</strong>
                            <button class="btn-secondary btn-copy-faq" style="padding: 2px 6px; font-size: 0.7rem; flex-shrink: 0;">
                                <i class="fas fa-copy"></i> Copy Q&A
                            </button>
                        </div>
                        <p style="margin: 0; color: #9ca3af; font-size: 0.88rem; line-height: 1.4;"><strong>A:</strong> ${faq.answer}</p>
                    `;

                    const copyBtn = card.querySelector('.btn-copy-faq');
                    copyBtn.addEventListener('click', () => {
                        const faqText = `Question: ${faq.question}\nAnswer: ${faq.answer}`;
                        navigator.clipboard.writeText(faqText).then(() => {
                            const originalText = copyBtn.innerHTML;
                            copyBtn.innerHTML = '<i class="fas fa-check" style="color: #34d399"></i> Copied!';
                            setTimeout(() => copyBtn.innerHTML = originalText, 2000);
                        });
                    });

                    faqsContainer.appendChild(card);
                });
            }
        }

        // Adjust CTA link and messages
        const dashFooterMsg = document.getElementById('dash-footer-message');
        const dashGeneratorCta = document.getElementById('dash-generator-cta');
        if (dashGeneratorCta && auditResult.profile) {
            const bp = auditResult.profile;
            dashGeneratorCta.href = `/generate.html?businessName=${encodeURIComponent(bp.name)}&towns=${encodeURIComponent(bp.address ? bp.address.split(',')[0] : '')}&services=${encodeURIComponent(bp.category)}`;
        }
    }

    // Tabs functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Show selected tab content
            const tabId = btn.getAttribute('data-tab');
            const targetTab = document.getElementById(tabId);
            if (targetTab) targetTab.classList.add('active');
        });
    });

    // Scroll to top button
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollToTopBtn.style.display = 'flex';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        });
        scrollToTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});
