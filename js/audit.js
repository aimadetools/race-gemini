document.addEventListener('DOMContentLoaded', () => {
    // Helper function for displaying messages (replicated from auth.html for consistency)
    const displayMessage = (element, message, isError = true) => {
        element.textContent = message;
        element.style.color = isError ? 'red' : 'green';
    };

    // Helper function for managing button loading state
    const setLoadingState = (button, isLoading, originalText) => {
        button.disabled = isLoading;
        if (isLoading) {
            button.innerHTML = `${originalText}... <span class="spinner"></span>`;
        } else {
            button.textContent = originalText;
        }
    };

    const auditForm = document.getElementById('auditUrlForm');
    const auditUrlInput = document.getElementById('auditUrl');
    const auditSubmitButton = auditForm.querySelector('button[type="submit"]'); // Get button
    const loadingDiv = document.getElementById('loading');
    const auditResultsDiv = document.getElementById('auditResults');
    const resultsContainer = document.getElementById('results-container');
    const errorMessageDiv = document.getElementById('form-error-message');
    const auditUrlErrorSpan = document.getElementById('auditUrl-error');

    // New elements for email capture
    const emailCaptureSection = document.getElementById('emailCaptureSection');
    const emailReportForm = document.getElementById('emailReportForm');
    const reportEmailInput = document.getElementById('reportEmail');
    const emailMessageDiv = document.getElementById('emailMessage');
    const emailReportSubmitButton = emailReportForm.querySelector('button[type="submit"]'); // Get button

    let currentAuditResults = null; // Store current audit results

    auditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = auditUrlInput.value;

        // Reset UI
        loadingDiv.style.display = 'block';
        auditResultsDiv.style.display = 'none';
        emailCaptureSection.style.display = 'none'; // Hide email capture on new audit
        resultsContainer.innerHTML = '';
        errorMessageDiv.style.display = 'none';
        auditUrlErrorSpan.textContent = ''; // Clear URL specific error
        auditUrlErrorSpan.style.display = 'none'; // Hide URL specific error
        emailMessageDiv.textContent = ''; // Clear previous email message

        if (!url) {
            displayMessage(auditUrlErrorSpan, 'Please enter a valid URL.');
            loadingDiv.style.display = 'none'; // Hide loading if validation fails
            return;
        }

        setLoadingState(auditSubmitButton, true, 'Start Audit');

        try {
            const response = await fetch('/api/audit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `An error occurred: ${response.statusText}`);
            }

            const results = await response.json();
            currentAuditResults = results; // Store the results
            auditUrlInput.value = ''; // Clear URL input after successful audit
            displayResults(results);
            emailCaptureSection.style.display = 'block'; // Show email capture after results

        } catch (error) {
            displayMessage(errorMessageDiv, error.message);
        } finally {
            loadingDiv.style.display = 'none';
            setLoadingState(auditSubmitButton, false, 'Start Audit');
        }
    });

    function createResultSection(title, type = '') {
        const section = document.createElement('div');
        section.className = `audit-section ${type}`;
        const heading = document.createElement('h3');
        heading.textContent = title;
        section.appendChild(heading);
        return section;
    }

    function createIssueList(issues) {
        const list = document.createElement('ul');
        list.className = 'audit-issue-list';
        issues.forEach(issue => {
            const item = document.createElement('li');
            item.className = 'audit-issue-item';
            // Customize display based on issue type
            if (issue.type === "Broken Link") {
                item.innerHTML = `<strong>URL:</strong> ${issue.url}<br><strong>Status/Error:</strong> ${issue.status_code || issue.error}`;
            } else if (issue.type === "Missing or Empty Alt Attribute") {
                item.innerHTML = `<strong>Element:</strong> <code>${issue.element}</code><br><strong>Source:</strong> ${issue.src}`;
            }
            list.appendChild(item);
        });
        return list;
    }

    function displayResults(results) {
        auditResultsDiv.style.display = 'block';
        resultsContainer.innerHTML = ''; // Clear previous results

        // Broken Links
        if (results.broken_links && results.broken_links.length > 0) {
            const section = createResultSection('Broken Links Found:', 'error');
            section.appendChild(createIssueList(results.broken_links));
            resultsContainer.appendChild(section);
        } else {
            const section = createResultSection('No Broken Links Found', 'success');
            resultsContainer.appendChild(section);
        }

        // Alt Attributes
        if (results.alt_attributes && results.alt_attributes.length > 0) {
            const section = createResultSection('Missing or Empty Alt Attributes:', 'warning');
            section.appendChild(createIssueList(results.alt_attributes));
            resultsContainer.appendChild(section);
        } else {
            const section = createResultSection('All Images Have Alt Attributes', 'success');
            resultsContainer.appendChild(section);
        }

        // Page Load Times
        if (results.page_load_times && results.page_load_times.metrics) {
            const section = createResultSection('Page Load Times:', 'info');
            const metrics = results.page_load_times.metrics;
            const p = document.createElement('p');
            p.innerHTML = `
                <strong>Time to First Byte (TTFB):</strong> ${metrics.ttfb !== 'N/A' ? metrics.ttfb + 's' : 'N/A'}<br>
                <strong>Total Time:</strong> ${metrics.total_time !== 'N/A' ? metrics.total_time + 's' : 'N/A'}
            `;
            section.appendChild(p);
            resultsContainer.appendChild(section);
        } else if (results.page_load_times && results.page_load_times.error) {
            const section = createResultSection('Page Load Times Audit Error:', 'error');
            const p = document.createElement('p');
            p.textContent = results.page_load_times.error;
            section.appendChild(p);
            resultsContainer.appendChild(section);
        }

        // H1 Tags
        if (results.h1_tags) {
            const h1Results = results.h1_tags;
            if (h1Results.num_h1_tags === 1) {
                const section = createResultSection('H1 Tag Audit:', 'success');
                const p = document.createElement('p');
                p.innerHTML = `<strong>Status:</strong> ${h1Results.issues[0].description}<br><strong>Content:</strong> "${h1Results.h1_content[0]}"`;
                section.appendChild(p);
                resultsContainer.appendChild(section);
            } else if (h1Results.num_h1_tags > 1) {
                const section = createResultSection('H1 Tag Audit:', 'warning');
                const p = document.createElement('p');
                p.innerHTML = `<strong>Status:</strong> ${h1Results.issues[0].description}<br><strong>Contents:</strong><br>${h1Results.h1_content.map(content => `- "${content}"`).join('<br>')}`;
                section.appendChild(p);
                resultsContainer.appendChild(section);
            } else { // num_h1_tags === 0
                const section = createResultSection('H1 Tag Audit:', 'error');
                const p = document.createElement('p');
                p.innerHTML = `<strong>Status:</strong> ${h1Results.issues[0].description}`;
                section.appendChild(p);
                resultsContainer.appendChild(section);
            }
        }
    }

    emailReportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = reportEmailInput.value;

        setLoadingState(emailReportSubmitButton, true, 'Send Report'); // Set loading state for email button

        if (!email) {
            displayMessage(emailMessageDiv, 'Please enter your email address.');
            setLoadingState(emailReportSubmitButton, false, 'Send Report'); // Reset button state
            return;
        }

        if (!currentAuditResults) {
            displayMessage(emailMessageDiv, 'No audit results to send.');
            setLoadingState(emailReportSubmitButton, false, 'Send Report'); // Reset button state
            return;
        }

        try {
            const response = await fetch('/api/send-audit-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, auditResults: currentAuditResults }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to send report: ${response.statusText}`);
            }

            displayMessage(emailMessageDiv, 'Report sent successfully!', false); // false for success
            reportEmailInput.value = ''; // Clear email input

        } catch (error) {
            displayMessage(emailMessageDiv, error.message);
        } finally {
            setLoadingState(emailReportSubmitButton, false, 'Send Report'); // Reset button state
        }
    });
});
