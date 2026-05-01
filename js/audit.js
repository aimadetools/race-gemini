document.addEventListener('DOMContentLoaded', () => {
    const auditForm = document.getElementById('auditUrlForm');
    const auditUrlInput = document.getElementById('auditUrl');
    const loadingDiv = document.getElementById('loading');
    const auditResultsDiv = document.getElementById('auditResults');
    const resultsContainer = document.getElementById('results-container');
    const errorMessageDiv = document.getElementById('form-error-message');

    auditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = auditUrlInput.value;

        if (!url) {
            errorMessageDiv.textContent = 'Please enter a valid URL.';
            errorMessageDiv.style.display = 'block';
            return;
        }

        // Reset UI
        loadingDiv.style.display = 'block';
        auditResultsDiv.style.display = 'none';
        resultsContainer.innerHTML = '';
        errorMessageDiv.style.display = 'none';

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
            displayResults(results);

        } catch (error) {
            errorMessageDiv.textContent = error.message;
            errorMessageDiv.style.display = 'block';
        } finally {
            loadingDiv.style.display = 'none';
        }
    });

    function displayResults(results) {
        auditResultsDiv.style.display = 'block';
        resultsContainer.innerHTML = ''; // Clear previous results

        const brokenLinks = results.broken_links;

        if (brokenLinks && brokenLinks.length > 0) {
            const heading = document.createElement('h3');
            heading.textContent = 'Broken Links Found:';
            resultsContainer.appendChild(heading);

            const list = document.createElement('ul');
            brokenLinks.forEach(link => {
                const item = document.createElement('li');
                item.innerHTML = `<strong>URL:</strong> ${link.url}<br><strong>Status/Error:</strong> ${link.status_code || link.error}`;
                list.appendChild(item);
            });
            resultsContainer.appendChild(list);
        } else {
            const successMessage = document.createElement('p');
            successMessage.textContent = 'Congratulations! No broken external links were found.';
            resultsContainer.appendChild(successMessage);
        }
    }
});
