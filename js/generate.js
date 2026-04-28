document.addEventListener('DOMContentLoaded', () => {
    const enableAICopyCheckbox = document.getElementById('enableAICopy');
    const aiStyleGroup = document.getElementById('ai-style-group');
    const generateForm = document.getElementById('generate-form');
    const submitButton = generateForm.querySelector('button[type="submit"]'); // Get submit button
    const loadingIndicator = document.getElementById('loading-indicator');
    const formErrorMessageDiv = document.getElementById('form-error-message');

    // Character counters
    const servicesInput = document.getElementById('services');
    const servicesCharCount = document.getElementById('services-char-count');
    const townsInput = document.getElementById('towns');
    const townsCharCount = document.getElementById('towns-char-count');

    function updateCharCount(inputElement, countElement) {
        countElement.textContent = inputElement.value.length;
    }

    servicesInput.addEventListener('input', () => updateCharCount(servicesInput, servicesCharCount));
    townsInput.addEventListener('input', () => updateCharCount(townsInput, townsCharCount));

    // Initial count update
    updateCharCount(servicesInput, servicesCharCount);
    updateCharCount(townsInput, townsCharCount);

    // Toggle AI Style group visibility
    enableAICopyCheckbox.addEventListener('change', function () {
        aiStyleGroup.style.display = this.checked ? 'block' : 'none';
    });

    // Helper function for validation feedback
    function showValidationError(inputElement, message) {
        inputElement.classList.add('is-invalid');
        const errorElement = document.getElementById(`${inputElement.id}-error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('error-message');
        }
    }

    function clearValidationError(inputElement) {
        inputElement.classList.remove('is-invalid');
        const errorElement = document.getElementById(`${inputElement.id}-error`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('error-message');
        }
    }

    function validateField(inputElement) {
        if (inputElement.hasAttribute('required') && inputElement.value.trim() === '') {
            showValidationError(inputElement, 'This field is required.');
            return false;
        } else {
            clearValidationError(inputElement);
            return true;
        }
    }

    // Attach real-time validation to required input fields
    const requiredInputs = generateForm.querySelectorAll('[required]');
    requiredInputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => validateField(input)); // Clear error as user types
    });

    generateForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        formErrorMessageDiv.textContent = ''; // Clear general form errors

        let formIsValid = true;
        requiredInputs.forEach(input => {
            if (!validateField(input)) {
                formIsValid = false;
            }
        });

        if (!formIsValid) {
            formErrorMessageDiv.textContent = 'Please correct the errors in the form.';
            return;
        }

        // Show loading spinner and disable button
        submitButton.disabled = true;
        submitButton.innerHTML = 'Generating... <span class="spinner"></span>';
        loadingIndicator.style.display = 'block';

        const formData = new FormData(generateForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data),
            });

            loadingIndicator.style.display = 'none';
            // Re-enable button and remove spinner
            submitButton.disabled = false;
            submitButton.innerHTML = 'Generate Pages';

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'localleads.zip';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                generateForm.reset(); // Clear form on successful download
                if (enableAICopyCheckbox.checked) {
                    aiStyleGroup.style.display = 'none'; // Hide AI style options if AI copy was enabled
                }
                formErrorMessageDiv.textContent = 'Pages generated and downloaded successfully!';
                formErrorMessageDiv.classList.remove('error-message');
                formErrorMessageDiv.classList.add('success-message');
            } else {
                const error = await response.json();
                formErrorMessageDiv.textContent = `Error: ${error.message}`;
                formErrorMessageDiv.classList.remove('success-message');
                formErrorMessageDiv.classList.add('error-message');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            loadingIndicator.style.display = 'none';
            // Re-enable button and remove spinner on error
            submitButton.disabled = false;
            submitButton.innerHTML = 'Generate Pages';
            formErrorMessageDiv.textContent = 'An unexpected error occurred. Please try again later.';
            formErrorMessageDiv.classList.remove('success-message');
            formErrorMessageDiv.classList.add('error-message');
        }
    });
});
