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
        mentionedCountSpan.textContent = `(${results.location_audit.mentioned_count})`;
        results.location_audit.mentioned_locations.forEach(location => {
            const li = document.createElement('li');
            li.textContent = location;
            mentionedList.appendChild(li);
        });

        // Display missed locations
        missedCountSpan.textContent = `(${results.location_audit.missed_count})`;
        results.location_audit.missed_locations.forEach(location => {
            const li = document.createElement('li');
            li.textContent = location;
            missedList.appendChild(li);
        });
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

        } catch (error) {
            emailMessageDiv.textContent = error.message;
            emailMessageDiv.style.color = 'red';
        } finally {
            emailReportSubmitButton.disabled = false;
            emailReportSubmitButton.textContent = 'Send Report';
        }
    });
});
