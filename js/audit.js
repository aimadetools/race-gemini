document.addEventListener('DOMContentLoaded', () => {
    const auditForm = document.getElementById('auditUrlForm');
    const auditUrlInput = document.getElementById('auditUrl');
    const locationsInput = document.getElementById('locations');
    const auditSubmitButton = auditForm.querySelector('button[type="submit"]');
    const loadingDiv = document.getElementById('loading');
    const auditResultsDiv = document.getElementById('auditResults');
    const errorMessageDiv = document.getElementById('form-error-message');

    // Result list elements
    const mentionedList = document.getElementById('mentioned-list');
    const missedList = document.getElementById('missed-list');
    const mentionedCountSpan = document.getElementById('mentioned-count');
    const missedCountSpan = document.getElementById('missed-count');

    // Email capture
    const emailCaptureSection = document.getElementById('emailCaptureSection');
    let currentAuditResults = null;

    auditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = auditUrlInput.value;
        const locations = locationsInput.value.split(',').map(loc => loc.trim()).filter(loc => loc);

        if (!url || locations.length === 0) {
            errorMessageDiv.textContent = 'Please enter a valid URL and at least one location.';
            errorMessageDiv.style.display = 'block';
            return;
        }

        // Reset UI
        loadingDiv.style.display = 'block';
        auditResultsDiv.style.display = 'none';
        emailCaptureSection.style.display = 'none';
        errorMessageDiv.textContent = '';
        errorMessageDiv.style.display = 'none';
        mentionedList.innerHTML = '';
        missedList.innerHTML = '';
        document.getElementById('broken-links-list').innerHTML = '';
        document.getElementById('h1-audit-list').innerHTML = '';
        document.getElementById('alt-attributes-list').innerHTML = '';
        document.getElementById('h2-h3-audit-list').innerHTML = '';
        document.getElementById('readability-audit-list').innerHTML = '';
        document.getElementById('mobile-friendliness-audit-list').innerHTML = '';
        document.getElementById('page-load-time-audit-list').innerHTML = '';
        document.getElementById('structured-data-audit-list').innerHTML = '';
        
        auditSubmitButton.disabled = true;
        auditSubmitButton.innerHTML = 'Auditing... <span class="spinner"></span>';


        try {
            const response = await fetch('/api/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, locations }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'An error occurred during the audit.');
            }

            const results = await response.json();
            currentAuditResults = results;
            displayResults(results);
            emailCaptureSection.style.display = 'block';
            trackEvent('audit_completed', { url: url, locations: locations });


        } catch (error) {
            errorMessageDiv.textContent = error.message;
            errorMessageDiv.style.display = 'block';
        } finally {
            loadingDiv.style.display = 'none';
            auditSubmitButton.disabled = false;
            auditSubmitButton.innerHTML = 'Start Audit';
        }
    });

    function displayResults(results) {
        auditResultsDiv.style.display = 'block';

        // Display mentioned locations
        if (results.location_audit && results.location_audit.mentioned_locations) {
            mentionedCountSpan.textContent = `(${results.location_audit.mentioned_count})`;
            results.location_audit.mentioned_locations.forEach(location => {
                const li = document.createElement('li');
                li.textContent = location;
                mentionedList.appendChild(li);
            });
        }

        // Display missed locations
        if (results.location_audit && results.location_audit.missed_locations) {
            missedCountSpan.textContent = `(${results.location_audit.missed_count})`;
            results.location_audit.missed_locations.forEach(location => {
                const li = document.createElement('li');
                li.textContent = location;
                missedList.appendChild(li);
            });
        }

        // Display broken links
        const brokenLinksList = document.getElementById('broken-links-list');
        const brokenLinksCount = document.getElementById('broken-links-count');
        if (results.broken_links_audit && results.broken_links_audit.broken_links) {
            const brokenLinks = results.broken_links_audit.broken_links;
            brokenLinksCount.textContent = `(${brokenLinks.length})`;
            if (brokenLinks.length > 0) {
                brokenLinks.forEach(link => {
                    const li = document.createElement('li');
                    li.textContent = `${link.url} (Status: ${link.status_code || link.error})`;
                    brokenLinksList.appendChild(li);
                });
            } else {
                brokenLinksList.innerHTML = '<li>No broken links found.</li>';
            }
        }

        // Display H1 audit results
        const h1AuditList = document.getElementById('h1-audit-list');
        const h1AuditCount = document.getElementById('h1-audit-count');
        if (results.h1_audit) {
            const issues = results.h1_audit.issues;
            h1AuditCount.textContent = `(${issues.length})`;
            if (issues.length > 0) {
                issues.forEach(issue => {
                    const li = document.createElement('li');
                    li.textContent = issue.description;
                    h1AuditList.appendChild(li);
                });
            } else {
                h1AuditList.innerHTML = '<li>H1 tag setup is optimal.</li>';
            }
        }

        // Display alt attribute audit results
        const altAttributesList = document.getElementById('alt-attributes-list');
        const altAttributesCount = document.getElementById('alt-attributes-count');
        if (results.alt_attributes_audit) {
            const issues = results.alt_attributes_audit;
            altAttributesCount.textContent = `(${issues.length})`;
            if (issues.length > 0) {
                issues.forEach(issue => {
                    const li = document.createElement('li');
                    li.innerHTML = `Missing alt on: <code>${escapeHtml(issue.element)}</code>`;
                    altAttributesList.appendChild(li);
                });
            } else {
                altAttributesList.innerHTML = '<li>All images have alt attributes.</li>';
            }
        }

        // Display H2/H3 audit results
        const h2h3AuditList = document.getElementById('h2-h3-audit-list');
        const h2h3AuditCount = document.getElementById('h2-h3-audit-count');
        if (results.h2_h3_audit && results.h2_h3_audit.issues) {
            const issues = results.h2_h3_audit.issues;
            h2h3AuditCount.textContent = `(${issues.length})`;
            if (issues.length > 0) {
                issues.forEach(issue => {
                    const li = document.createElement('li');
                    li.textContent = issue.description;
                    h2h3AuditList.appendChild(li);
                });
            } else {
                h2h3AuditList.innerHTML = '<li>H2/H3 tag structure is optimal.</li>';
            }
        }

        // Display readability audit results
        const readabilityAuditList = document.getElementById('readability-audit-list');
        if (results.readability_audit) {
            const { flesch_reading_ease, flesch_kincaid_grade, issues } = results.readability_audit;
            if (issues && issues.length > 0) {
                const li = document.createElement('li');
                li.textContent = issues[0].description;
                readabilityAuditList.appendChild(li);
            } else {
                const easeLi = document.createElement('li');
                easeLi.textContent = `Flesch Reading Ease: ${flesch_reading_ease}`;
                readabilityAuditList.appendChild(easeLi);

                const gradeLi = document.createElement('li');
                gradeLi.textContent = `Flesch-Kincaid Grade Level: ${flesch_kincaid_grade}`;
                readabilityAuditList.appendChild(gradeLi);
            }
        }

        // Display mobile-friendliness audit results
        const mobileFriendlinessAuditList = document.getElementById('mobile-friendliness-audit-list');
        if (results.mobile_friendliness_audit) {
            const { is_mobile_friendly, score } = results.mobile_friendliness_audit;
            const friendlyLi = document.createElement('li');
            friendlyLi.textContent = `Mobile-Friendly: ${is_mobile_friendly ? 'Yes' : 'No'}`;
            mobileFriendlinessAuditList.appendChild(friendlyLi);

            const scoreLi = document.createElement('li');
            scoreLi.textContent = `Score: ${score}/100`;
            mobileFriendlinessAuditList.appendChild(scoreLi);
        }

        // Display page load time audit results
        const pageLoadTimeAuditList = document.getElementById('page-load-time-audit-list');
        if (results.page_load_time_audit) {
            const { load_time, status_code, error } = results.page_load_time_audit;
            if (error) {
                const errorLi = document.createElement('li');
                errorLi.textContent = `Error: ${error}`;
                pageLoadTimeAuditList.appendChild(errorLi);
            } else {
                const loadTimeLi = document.createElement('li');
                loadTimeLi.textContent = `Page Load Time: ${load_time} seconds`;
                pageLoadTimeAuditList.appendChild(loadTimeLi);

                const statusCodeLi = document.createElement('li');
                statusCodeLi.textContent = `Status Code: ${status_code}`;
                pageLoadTimeAuditList.appendChild(statusCodeLi);
            }
        }

        // Display structured data audit results
        const structuredDataAuditList = document.getElementById('structured-data-audit-list');
        if (results.structured_data_audit) {
            const { structured_data, error } = results.structured_data_audit;
            if (error) {
                const errorLi = document.createElement('li');
                errorLi.textContent = `Error: ${error}`;
                structuredDataAuditList.appendChild(errorLi);
            } else if (structured_data && structured_data.length > 0) {
                structured_data.forEach(item => {
                    const li = document.createElement('li');
                    const pre = document.createElement('pre');
                    pre.textContent = JSON.stringify(item, null, 2);
                    li.appendChild(pre);
                    structuredDataAuditList.appendChild(li);
                });
            } else {
                structuredDataAuditList.innerHTML = '<li>No structured data found.</li>';
            }
        }

        // Display Robots.txt audit results
        const robotsTxtAuditList = document.getElementById('robots-txt-audit-list');
        robotsTxtAuditList.innerHTML = ''; // Clear previous results
        if (results.robots_txt_audit) {
            const { issues } = results.robots_txt_audit;
            if (issues && issues.length > 0) {
                issues.forEach(issue => {
                    const li = document.createElement('li');
                    li.textContent = issue.description;
                    li.classList.add(issue.type); // 'error' or 'warning'
                    robotsTxtAuditList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'No issues found with robots.txt.';
                li.classList.add('success');
                robotsTxtAuditList.appendChild(li);
            }
        }

        // Display Canonical Tags audit results
        const canonicalTagsAuditList = document.getElementById('canonical-tags-audit-list');
        canonicalTagsAuditList.innerHTML = ''; // Clear previous results
        if (results.canonical_tags_audit) {
            const { issues } = results.canonical_tags_audit;
            if (issues && issues.length > 0) {
                issues.forEach(issue => {
                    const li = document.createElement('li');
                    li.textContent = issue.description;
                    li.classList.add(issue.type); // 'error' or 'warning'
                    canonicalTagsAuditList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'No issues found with canonical tags.';
                li.classList.add('success');
                canonicalTagsAuditList.appendChild(li);
            }
        }

        // Display Sitemap.xml audit results
        const sitemapXmlAuditList = document.getElementById('sitemap-xml-audit-list');
        sitemapXmlAuditList.innerHTML = ''; // Clear previous results
        if (results.sitemap_xml_audit) {
            const { issues } = results.sitemap_xml_audit;
            if (issues && issues.length > 0) {
                issues.forEach(issue => {
                    const li = document.createElement('li');
                    li.textContent = issue.description;
                    li.classList.add(issue.type); // 'error' or 'warning'
                    sitemapXmlAuditList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'No issues found with sitemap.xml.';
                li.classList.add('success');
                sitemapXmlAuditList.appendChild(li);
            }
        }

        // Display Schema Markup audit results
        const schemaMarkupAuditList = document.getElementById('schema-markup-audit-list');
        schemaMarkupAuditList.innerHTML = ''; // Clear previous results
        if (results.schema_markup_audit) {
            const { issues } = results.schema_markup_audit;
            if (issues && issues.length > 0) {
                // Filter out success messages if you only want to show actual problems
                const actualIssues = issues.filter(issue => issue.type !== "JSON-LD Schema Found" && issue.type !== "Microdata Schema Found" && issue.type !== "RDFa Schema Found");

                if (actualIssues.length > 0) {
                    actualIssues.forEach(issue => {
                        const li = document.createElement('li');
                        li.textContent = issue.description;
                        li.classList.add(issue.type); // 'error' or 'warning'
                        schemaMarkupAuditList.appendChild(li);
                    });
                } else {
                    const foundTypes = issues.map(issue => issue.type.replace(' Schema Found', '')).filter(type => type !== 'No Schema Markup Found');
                    if (foundTypes.length > 0) {
                        const li = document.createElement('li');
                        li.textContent = `Schema markup found (Types: ${foundTypes.join(', ')}).`;
                        li.classList.add('success');
                        schemaMarkupAuditList.appendChild(li);
                    } else {
                        const li = document.createElement('li');
                        li.textContent = 'No schema markup found.';
                        li.classList.add('warning'); // Or 'error' depending on how critical this is
                        schemaMarkupAuditList.appendChild(li);
                    }
                }
            } else {
                const li = document.createElement('li');
                li.textContent = 'No schema markup found.';
                li.classList.add('warning');
                schemaMarkupAuditList.appendChild(li);
            }
        }

        // Display Meta Tags audit results
        const metaTagsAuditList = document.getElementById('meta-tags-audit-list');
        metaTagsAuditList.innerHTML = ''; // Clear previous results
        if (results.meta_tags_audit) {
            const { issues } = results.meta_tags_audit;
            if (issues && issues.length > 0) {
                issues.forEach(issue => {
                    const li = document.createElement('li');
                    li.textContent = issue.description;
                    li.classList.add(issue.type); // 'Missing', 'Short', 'Long'
                    metaTagsAuditList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'Page titles and meta descriptions are optimal.';
                li.classList.add('success');
                metaTagsAuditList.appendChild(li);
            }
        }

        // Display Header Response Codes audit results
        const headerResponseCodesAuditList = document.getElementById('header-response-codes-audit-list');
        headerResponseCodesAuditList.innerHTML = ''; // Clear previous results
        if (results.header_response_codes_audit) {
            const { issues } = results.header_response_codes_audit;
            if (issues && issues.length > 0) {
                issues.forEach(issue => {
                    const li = document.createElement('li');
                    li.textContent = issue.description;
                    li.classList.add(issue.type.toLowerCase().replace(/\s/g, '-')); // 'success', 'redirect', '404-not-found', etc.
                    headerResponseCodesAuditList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'Page returns a 200 OK status code.';
                li.classList.add('success');
                headerResponseCodesAuditList.appendChild(li);
            }
        }
        
        // Display GBP Category Check results
        const gbpCategoryContainer = document.getElementById('gbp-category-container');
        gbpCategoryContainer.innerHTML = ''; // Clear previous results
        if (results.gbp_category_check) {
            const { businessCategory, confidence, error } = results.gbp_category_check;
            if (error) {
                const errorEl = document.createElement('p');
                errorEl.textContent = `Error: ${error}`;
                errorEl.classList.add('error-message');
                gbpCategoryContainer.appendChild(errorEl);
            } else {
                const resultContainer = document.createElement('div');
                resultContainer.classList.add('gbp-result-card');

                const categoryTitle = document.createElement('h4');
                categoryTitle.textContent = 'Detected Business Category:';
                resultContainer.appendChild(categoryTitle);

                const categoryDisplay = document.createElement('p');
                if (businessCategory && businessCategory !== 'Not specified') {
                    categoryDisplay.innerHTML = `<span class="category-badge">${businessCategory}</span>`;
                } else {
                    categoryDisplay.innerHTML = `<span class="category-badge category-not-specified">Could not determine specific category</span>`;
                    const explanation = document.createElement('p');
                    explanation.classList.add('explanation-text');
                    explanation.textContent = 'This usually happens if the website does not explicitly state a primary business type or if our geocoding service cannot infer it from the address details.';
                    resultContainer.appendChild(explanation);
                }
                resultContainer.appendChild(categoryDisplay);

                if (confidence) {
                    const confidenceDisplay = document.createElement('p');
                    let confidenceText;
                    let confidenceClass = '';
                    if (confidence >= 8) {
                        confidenceText = 'High';
                        confidenceClass = 'confidence-high';
                    } else if (confidence >= 5) {
                        confidenceText = 'Medium';
                        confidenceClass = 'confidence-medium';
                    } else {
                        confidenceText = 'Low';
                        confidenceClass = 'confidence-low';
                    }
                    confidenceDisplay.innerHTML = `Confidence: <span class="${confidenceClass}">${confidenceText} (${confidence}/10)</span>`;
                    resultContainer.appendChild(confidenceDisplay);
                }
                gbpCategoryContainer.appendChild(resultContainer);
            }
        }
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }


    // Email report functionality remains similar, but you might want to adjust the payload
    const emailReportForm = document.getElementById('emailReportForm');
    const reportEmailInput = document.getElementById('reportEmail');
    const emailMessageDiv = document.getElementById('emailMessage');
    const emailReportSubmitButton = document.getElementById('sendEmailBtn') || emailReportForm.querySelector('button[type="submit"]');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');

    if (emailReportForm) {
        emailReportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = reportEmailInput.value;

            if (!email || !currentAuditResults) {
                emailMessageDiv.textContent = 'Please provide an email and run an audit first.';
                emailMessageDiv.style.color = 'red';
                return;
            }
            
            emailReportSubmitButton.disabled = true;
            if (downloadPdfBtn) downloadPdfBtn.disabled = true;
            emailReportSubmitButton.innerHTML = 'Sending... <span class="spinner"></span>';

            try {
                const response = await fetch('/api/send-audit-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, auditResults: currentAuditResults, url: auditUrlInput.value }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to send report.');
                }

                emailMessageDiv.innerHTML = `
                    <div class="success-card" style="margin-top: 1.5rem; padding: 2rem; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); animation: fadeIn 0.5s ease-out;">
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📩</div>
                        <h4 style="color: #60a5fa; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; font-family: 'Inter', sans-serif;">Report Sent Successfully!</h4>
                        <p style="color: #9ca3af; font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5;">We have sent a comprehensive analysis of your SEO opportunities and missing location keywords to your inbox.</p>
                        <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 1.5rem 0 1rem; padding-top: 1.5rem;">
                            <p style="color: #f3f4f6; font-weight: 600; margin-bottom: 1.5rem; font-size: 1.1rem;">Ready to claim these missing customers? Choose your path:</p>
                            <div style="display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; margin-top: 1rem;">
                                <div style="flex: 1; min-width: 250px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.1); padding: 1.5rem; border-radius: 8px; box-sizing: border-box;">
                                    <h5 style="color: #e5e7eb; font-size: 1rem; margin-top: 0; margin-bottom: 0.5rem; font-weight: bold; font-family: 'Inter', sans-serif;">Option A: Start Free</h5>
                                    <p style="color: #9ca3af; font-size: 0.85rem; margin-bottom: 1.5rem; line-height: 1.4;">Use your 5 free signup credits to build your first local SEO pages.</p>
                                    <a href="/generate.html" class="button" style="display: inline-block; text-decoration: none; padding: 0.6rem 1.2rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border-radius: 6px; font-weight: bold; font-size: 0.9rem; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); transition: transform 0.2s, box-shadow 0.2s;">
                                        Generate 5 Pages Free
                                    </a>
                                </div>
                                <div style="flex: 1; min-width: 250px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 1.5rem; border-radius: 8px; box-sizing: border-box;">
                                    <h5 style="color: #34d399; font-size: 1rem; margin-top: 0; margin-bottom: 0.5rem; font-weight: bold; font-family: 'Inter', sans-serif;">🔥 Option B: Upgrade &amp; Dominate</h5>
                                    <p style="color: #a7f3d0; font-size: 0.85rem; margin-bottom: 1.5rem; line-height: 1.4;">Unlock 200 page credits to dominate your entire local service area.</p>
                                    <form action="/api/checkout" method="POST" style="margin: 0; display: inline-block;">
                                        <input name="creditPackId" type="hidden" value="pack_pro"/>
                                        <button type="submit" class="button" style="display: inline-block; padding: 0.6rem 1.2rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 0.9rem; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
                                            Get Pro Pack (200 pages) for $99
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                emailMessageDiv.style.color = '';
                reportEmailInput.value = '';
                trackEvent('email_report_sent', { email: email, success: true });
            } catch (error) {
                emailMessageDiv.textContent = error.message;
                emailMessageDiv.style.color = 'red';
            } finally {
                emailReportSubmitButton.disabled = false;
                if (downloadPdfBtn) downloadPdfBtn.disabled = false;
                emailReportSubmitButton.textContent = 'Send Report';
            }
        });
    }

    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = reportEmailInput.value;

            // Trigger HTML5 validation reporting if empty or invalid email
            if (!reportEmailInput.checkValidity()) {
                reportEmailInput.reportValidity();
                return;
            }

            if (!email || !currentAuditResults) {
                emailMessageDiv.textContent = 'Please provide an email and run an audit first.';
                emailMessageDiv.style.color = 'red';
                return;
            }

            downloadPdfBtn.disabled = true;
            emailReportSubmitButton.disabled = true;
            downloadPdfBtn.innerHTML = 'Generating... <span class="spinner"></span>';

            try {
                // 1. Send report request to `/api/send-audit-report` to capture email lead
                const response = await fetch('/api/send-audit-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, auditResults: currentAuditResults, url: auditUrlInput.value }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to send email report.');
                }

                // 2. Generate and download PDF client-side
                const element = document.getElementById('results-container');
                let domainName = 'website';
                try {
                    domainName = new URL(auditUrlInput.value).hostname;
                } catch (_) {}

                const opt = {
                    margin:       0.5,
                    filename:     `seo-audit-report-${domainName}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { 
                        scale: 2, 
                        useCORS: true,
                        onclone: (clonedDoc) => {
                            // Style the cloned container for a print-friendly light-mode PDF
                            const container = clonedDoc.getElementById('results-container');
                            if (container) {
                                container.style.backgroundColor = '#ffffff';
                                container.style.color = '#111111';
                                container.style.padding = '20px';
                                container.style.fontFamily = 'Inter, sans-serif';
                                
                                const sections = container.querySelectorAll('.audit-section');
                                sections.forEach(sec => {
                                    sec.style.backgroundColor = '#f9f9f9';
                                    sec.style.color = '#333333';
                                    sec.style.border = '1px solid #e2e8f0';
                                    sec.style.boxShadow = 'none';
                                    sec.style.marginBottom = '15px';
                                    sec.style.borderRadius = '8px';
                                    sec.style.padding = '15px';
                                    
                                    const h3 = sec.querySelector('h3');
                                    if (h3) {
                                        h3.style.borderBottom = '2px solid #e2e8f0';
                                        h3.style.paddingBottom = '5px';
                                        h3.style.marginTop = '0';
                                        h3.style.fontSize = '1.4rem';
                                        
                                        // Keep standard colors or make them readable on light bg
                                        if (sec.classList.contains('error')) h3.style.color = '#dc3545';
                                        else if (sec.classList.contains('warning')) h3.style.color = '#d97706';
                                        else if (sec.classList.contains('info')) h3.style.color = '#0284c7';
                                        else if (sec.classList.contains('success')) h3.style.color = '#16a34a';
                                        else h3.style.color = '#111827';
                                    }
                                    
                                    const items = sec.querySelectorAll('.audit-issue-item');
                                    items.forEach(item => {
                                        item.style.backgroundColor = '#ffffff';
                                        item.style.color = '#374151';
                                        item.style.border = '1px solid #e5e7eb';
                                        item.style.borderLeft = '4px solid';
                                        item.style.padding = '8px 12px';
                                        item.style.marginBottom = '8px';
                                        item.style.borderRadius = '4px';
                                        
                                        if (sec.classList.contains('error')) item.style.borderLeftColor = '#dc3545';
                                        else if (sec.classList.contains('warning')) item.style.borderLeftColor = '#ffc107';
                                        else if (sec.classList.contains('info')) item.style.borderLeftColor = '#17a2b8';
                                        else if (sec.classList.contains('success')) item.style.borderLeftColor = '#28a745';
                                    });

                                    const successText = sec.querySelector('p');
                                    if (successText && sec.classList.contains('success')) {
                                        successText.style.color = '#16a34a';
                                    }
                                });
                                
                                const badges = container.querySelectorAll('.category-badge');
                                badges.forEach(badge => {
                                    badge.style.backgroundColor = '#007bff';
                                    badge.style.color = '#ffffff';
                                    badge.style.padding = '4px 10px';
                                    badge.style.borderRadius = '20px';
                                    badge.style.fontWeight = 'bold';
                                });
                                
                                const gbpResultCard = container.querySelector('.gbp-result-card');
                                if (gbpResultCard) {
                                    gbpResultCard.style.backgroundColor = '#f3f4f6';
                                    gbpResultCard.style.border = '1px solid #e5e7eb';
                                    gbpResultCard.style.color = '#1f2937';
                                }
                            }
                        }
                    },
                    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
                };

                // Generate the PDF
                await html2pdf().set(opt).from(element).save();

                // Show success card
                emailMessageDiv.innerHTML = `
                    <div class="success-card" style="margin-top: 1.5rem; padding: 2rem; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); animation: fadeIn 0.5s ease-out;">
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📥</div>
                        <h4 style="color: #60a5fa; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; font-family: 'Inter', sans-serif;">PDF Generated &amp; Email Sent!</h4>
                        <p style="color: #9ca3af; font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5;">Your PDF report has been downloaded, and a copy has been sent to <strong>${escapeHtml(email)}</strong>.</p>
                        <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 1.5rem 0 1rem; padding-top: 1.5rem;">
                            <p style="color: #f3f4f6; font-weight: 600; margin-bottom: 1.5rem; font-size: 1.1rem;">Ready to claim these missing customers? Choose your path:</p>
                            <div style="display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; margin-top: 1rem;">
                                <div style="flex: 1; min-width: 250px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.1); padding: 1.5rem; border-radius: 8px; box-sizing: border-box;">
                                    <h5 style="color: #e5e7eb; font-size: 1rem; margin-top: 0; margin-bottom: 0.5rem; font-weight: bold; font-family: 'Inter', sans-serif;">Option A: Start Free</h5>
                                    <p style="color: #9ca3af; font-size: 0.85rem; margin-bottom: 1.5rem; line-height: 1.4;">Use your 5 free signup credits to build your first local SEO pages.</p>
                                    <a href="/generate.html" class="button" style="display: inline-block; text-decoration: none; padding: 0.6rem 1.2rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border-radius: 6px; font-weight: bold; font-size: 0.9rem; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); transition: transform 0.2s, box-shadow 0.2s;">
                                        Generate 5 Pages Free
                                    </a>
                                </div>
                                <div style="flex: 1; min-width: 250px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 1.5rem; border-radius: 8px; box-sizing: border-box;">
                                    <h5 style="color: #34d399; font-size: 1rem; margin-top: 0; margin-bottom: 0.5rem; font-weight: bold; font-family: 'Inter', sans-serif;">🔥 Option B: Upgrade &amp; Dominate</h5>
                                    <p style="color: #a7f3d0; font-size: 0.85rem; margin-bottom: 1.5rem; line-height: 1.4;">Unlock 200 page credits to dominate your entire local service area.</p>
                                    <form action="/api/checkout" method="POST" style="margin: 0; display: inline-block;">
                                        <input name="creditPackId" type="hidden" value="pack_pro"/>
                                        <button type="submit" class="button" style="display: inline-block; padding: 0.6rem 1.2rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 0.9rem; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
                                            Get Pro Pack (200 pages) for $99
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                emailMessageDiv.style.color = '';
                reportEmailInput.value = '';
                trackEvent('pdf_report_downloaded', { email: email, success: true });
            } catch (error) {
                emailMessageDiv.textContent = error.message;
                emailMessageDiv.style.color = 'red';
            } finally {
                downloadPdfBtn.disabled = false;
                emailReportSubmitButton.disabled = false;
                downloadPdfBtn.textContent = 'Download PDF';
            }
        });
    }
});
