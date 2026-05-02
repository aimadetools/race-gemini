document.addEventListener('DOMContentLoaded', () => {
    const auditForm = document.getElementById('auditUrlForm');
    const auditUrlInput = document.getElementById('auditUrl');
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

    let currentAuditResults = null; // Store current audit results

    auditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = auditUrlInput.value;

        if (!url) {
            auditUrlErrorSpan.textContent = 'Please enter a valid URL.';
            auditUrlErrorSpan.style.display = 'block';
            return;
        }

        // Reset UI
        loadingDiv.style.display = 'block';
        auditResultsDiv.style.display = 'none';
        emailCaptureSection.style.display = 'none'; // Hide email capture on new audit
        resultsContainer.innerHTML = '';
        errorMessageDiv.style.display = 'none';
        auditUrlErrorSpan.textContent = ''; // Clear URL specific error
        auditUrlErrorSpan.style.display = 'none'; // Hide URL specific error
        emailMessageDiv.textContent = ''; // Clear previous email message

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
            errorMessageDiv.textContent = error.message;
            errorMessageDiv.style.display = 'block';
        } finally {
            loadingDiv.style.display = 'none';
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
    }

    emailReportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = reportEmailInput.value;

        if (!email) {
            emailMessageDiv.textContent = 'Please enter your email address.';
            emailMessageDiv.className = 'email-message--error';
            return;
            }

            if (!currentAuditResults) {
            emailMessageDiv.textContent = 'No audit results to send.';
            emailMessageDiv.className = 'email-message--error';
            return;
            }

            emailMessageDiv.textContent = 'Sending report...';
            emailMessageDiv.className = 'email-message--info';

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

            emailMessageDiv.textContent = 'Report sent successfully!';
            emailMessageDiv.className = 'email-message--success';
            reportEmailInput.value = ''; // Clear email input

            } catch (error) {
            emailMessageDiv.textContent = error.message;
            emailMessageDiv.className = 'email-message--error';
            }    });
});
