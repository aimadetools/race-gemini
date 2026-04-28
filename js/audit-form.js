// js/audit-form.js
document.addEventListener('DOMContentLoaded', () => {
    const auditForm = document.getElementById('auditForm');
    const formSteps = document.querySelectorAll('.form-step');
    const auditResultsDiv = document.getElementById('auditResults');
    const formErrorDiv = document.getElementById('form-error-message'); // Error display area

    // Character counters for audit form
    const auditServicesInput = document.getElementById('auditServices');
    const auditServicesCharCount = document.getElementById('auditServices-char-count');
    const auditTownsInput = document.getElementById('auditTowns');
    const auditTownsCharCount = document.getElementById('auditTowns-char-count');

    function updateCharCount(inputElement, countElement) {
        if (countElement) { // Check if the countElement exists
            countElement.textContent = inputElement.value.length;
        }
    }

    // Attach event listeners for real-time character counting
    if (auditServicesInput && auditServicesCharCount) {
        auditServicesInput.addEventListener('input', () => updateCharCount(auditServicesInput, auditServicesCharCount));
        updateCharCount(auditServicesInput, auditServicesCharCount); // Initial update
    }
    if (auditTownsInput && auditTownsCharCount) {
        auditTownsInput.addEventListener('input', () => updateCharCount(auditTownsInput, auditTownsCharCount));
        updateCharCount(auditTownsInput, auditTownsCharCount); // Initial update
    }

    let currentStep = 0;

    function showStep(step) {
        formSteps.forEach((s, index) => {
            s.classList.remove('active');
            if (index === step) {
                s.classList.add('active');
            }
        });
        currentStep = step;
    }

    function validateStep(step) {
        const currentFormStep = formSteps[step];
        const inputs = currentFormStep.querySelectorAll('[required]');
        let allValid = true;
        inputs.forEach(input => {
            if (!input.value.trim()) {
                allValid = false;
                input.classList.add('is-invalid'); // Add visual cue for invalid input
            } else {
                input.classList.remove('is-invalid');
            }
        });
        return allValid;
    }

    // Event listeners for navigation buttons
    auditForm.addEventListener('click', (event) => {
        if (event.target.classList.contains('next-step')) {
            if (validateStep(currentStep)) {
                formErrorDiv.textContent = ''; // Clear errors on successful step validation
                formErrorDiv.classList.remove('error-message');
                formErrorDiv.classList.remove('success-message');
                showStep(currentStep + 1);
            } else {
                formErrorDiv.textContent = 'Please fill in all required fields for this step.';
                formErrorDiv.classList.add('error-message');
                formErrorDiv.classList.remove('success-message');
            }
        } else if (event.target.classList.contains('prev-step')) {
            formErrorDiv.textContent = ''; // Clear errors when going back
            formErrorDiv.classList.remove('error-message');
            formErrorDiv.classList.remove('success-message');
            showStep(currentStep - 1);
        }
    });

    // Handle form submission
    auditForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        formErrorDiv.textContent = ''; // Clear previous errors
        formErrorDiv.classList.remove('error-message');
        formErrorDiv.classList.remove('success-message');

        if (!validateStep(currentStep)) {
            formErrorDiv.textContent = 'Please fill in all required fields before submitting.';
            formErrorDiv.classList.add('error-message');
            return;
        }
        
        const submitButton = auditForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = 'Submitting... <span class="spinner"></span>';

        const formData = new FormData(auditForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/audit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            submitButton.disabled = false;
            submitButton.innerHTML = 'Get My Free Audit';

            if (response.ok) {
                const result = await response.json(); // Parse the JSON response
                auditForm.style.display = 'none';
                auditResultsDiv.style.display = 'block';
                formErrorDiv.textContent = ''; // Clear any lingering errors
                formErrorDiv.classList.remove('error-message');

                // Populate auditResultsDiv with dynamic content
                const auditSummary = result.auditSummary;
                const auditId = result.auditId;

                let resultsHtml = `<h2 data-i18n-key="audit_results_title">Audit Results</h2>`;
                resultsHtml += `<p>Thank you for submitting your information. Your Audit ID is: <strong>${auditId}</strong></p>`;
                resultsHtml += `<p>Based on your input, here's a summary of your local search potential:</p>`;
                resultsHtml += `<ul>`;
                resultsHtml += `<li>Number of Services Provided: <strong>${auditSummary.numberOfServices}</strong></li>`;
                resultsHtml += `<li>Number of Target Towns/Cities: <strong>${auditSummary.numberOfTowns}</strong></li>`;
                resultsHtml += `<li>Potential Number of Optimized Local Pages: <strong>${auditSummary.potentialPages}</strong></li>`;
                resultsHtml += `</ul>`;
                resultsHtml += `<p>An email with more detailed insights will be sent to you shortly. In the meantime, explore how LocalLeads can help you capture more local customers:</p>`;
                resultsHtml += `<a class="button" data-i18n-key="audit_generate_pages_button" href="generate.html">Generate Local Pages Now</a>`;

                auditResultsDiv.innerHTML = resultsHtml; // Set the dynamic content
            } else {
                const error = await response.json();
                formErrorDiv.textContent = `Error: ${error.message}`;
                formErrorDiv.classList.add('error-message');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            submitButton.disabled = false;
            submitButton.innerHTML = 'Get My Free Audit';
            formErrorDiv.textContent = 'An unexpected error occurred. Please try again later.';
            formErrorDiv.classList.add('error-message');
        }
    });

    // Initial step display
    showStep(0);
});
