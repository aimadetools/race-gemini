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
    const emailReportSubmitButton = emailReportForm.querySelector('button[type="submit"]');

    emailReportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = reportEmailInput.value;

        if (!email || !currentAuditResults) {
            emailMessageDiv.textContent = 'Please provide an email and run an audit first.';
            return;
        }
        
        emailReportSubmitButton.disabled = true;
        emailReportSubmitButton.textContent = 'Sending...';

        try {
            const response = await fetch('/api/send-audit-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, auditResults: currentAuditResults }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send report.');
            }

            emailMessageDiv.textContent = 'Report sent successfully!';
            emailMessageDiv.style.color = 'green';
            reportEmailInput.value = '';
            trackEvent('email_report_sent', { email: email, success: true });
        } catch (error) {
            emailMessageDiv.textContent = error.message;
            emailMessageDiv.style.color = 'red';
        } finally {
            emailReportSubmitButton.disabled = false;
            emailReportSubmitButton.textContent = 'Send Report';
        }
    });
});
