document.addEventListener('DOMContentLoaded', () => {
    const auditForm = document.getElementById('audit-form');
    const auditResults = document.getElementById('audit-results');
    const websiteUrlInput = document.getElementById('website-url');

    auditForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const url = websiteUrlInput.value;
        
        if (!url) {
            auditResults.innerHTML = '<p class="error">Please enter a valid website URL.</p>';
            return;
        }

        auditResults.innerHTML = '<p>Auditing your website... This may take a moment.</p>';

        try {
            // In a real scenario, we would have a backend service to do this, to avoid CORS issues.
            // For this prototype, we'll have to rely on APIs that have CORS enabled, or use a backend.
            // Let's assume for now we have a serverless function to help us.
            const response = await fetch(`/api/free-audit?url=${encodeURIComponent(url)}`);
            
            if (!response.ok) {
                throw new Error('Failed to audit website.');
            }

            const data = await response.json();
            
            displayResults(data);

        } catch (error) {
            console.error(error);
            auditResults.innerHTML = `<p class="error">An error occurred while auditing your website. Please try again later.</p>`;
        }
    });

    function displayResults(data) {
        if (!data.foundPages || !data.missedOpportunities) {
            auditResults.innerHTML = `<p class="error">Could not retrieve audit results.</p>`;
            return;
        }

        let resultsHTML = `
            <h3>Audit Results</h3>
            <p>We analyzed your website and found the following:</p>
            <h4>Your current local SEO reach:</h4>
            <ul>
                ${data.foundPages.map(page => `<li>${page}</li>`).join('')}
            </ul>
            <h4>Missed opportunities:</h4>
            <p>You could be reaching customers in these nearby towns:</p>
            <ul>
                ${data.missedOpportunities.map(town => `<li>${town}</li>`).join('')}
            </ul>
            <div class="call-to-action">
                <h4>Ready to reach these customers?</h4>
                <p>Enter your email below and we'll send you a detailed report on how to generate pages for these locations.</p>
                <form id="email-capture-form">
                    <input type="email" id="email-input" placeholder="Enter your email" required>
                    <button type="submit">Get My Report</button>
                </form>
            </div>
        `;

        auditResults.innerHTML = resultsHTML;

        const emailCaptureForm = document.getElementById('email-capture-form');
        emailCaptureForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = document.getElementById('email-input').value;
            // Here you would send the email to your backend to be saved
            console.log(`Email captured: ${email}`);
            auditResults.innerHTML += '<p>Thank you! Your report is on its way.</p>';
            emailCaptureForm.style.display = 'none';
        });
    }
});
