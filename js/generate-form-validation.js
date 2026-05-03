document.addEventListener('DOMContentLoaded', function() {
    const generateForm = document.getElementById('generate-form');
    const formErrorDisplay = document.getElementById('form-error-message');

    const inputErrors = {
        businessName: 'Business Name is required.',
        zipCode: 'Business Zip Code is required.',
        services: 'Services are required.',
        towns: 'Towns are required.'
    };

    const displayError = (inputElement, message) => {
        const errorSpan = document.getElementById(`${inputElement.id}-error`);
        if (errorSpan) {
            errorSpan.textContent = message;
            errorSpan.style.display = 'block';
            inputElement.classList.add('input-error');
        }
    };

    const clearError = (inputElement) => {
        const errorSpan = document.getElementById(`${inputElement.id}-error`);
        if (errorSpan) {
            errorSpan.textContent = '';
            errorSpan.style.display = 'none';
            inputElement.classList.remove('input-error');
        }
        formErrorDisplay.textContent = '';
    };

    const validateInput = (inputElement) => {
        let isValid = true;
        clearError(inputElement); // Clear previous errors

        if (inputElement.hasAttribute('required') && inputElement.value.trim() === '') {
            displayError(inputElement, inputErrors[inputElement.id] || 'This field is required.');
            isValid = false;
        } 
        // Additional validation for services/towns to prevent just whitespace and trim items
        else if (inputElement.id === 'services' || inputElement.id === 'towns') {
            const items = inputElement.value.split(',').map(item => item.trim()).filter(item => item !== '');
            inputElement.value = items.join(', '); // Update input with trimmed values

            if (items.length === 0 && inputElement.hasAttribute('required')) {
                displayError(inputElement, inputErrors[inputElement.id] || 'Please enter at least one value.');
                isValid = false;
            } else if (inputElement.value.split(',').some(item => item.trim() === '')) {
                displayError(inputElement, `Please ensure all ${inputElement.id} are not empty.`);
                isValid = false;
            }
        }
        // Basic zip code validation (e.g., 5 digits)
        else if (inputElement.id === 'zipCode') {
            const zipCodePattern = /^\d{5}$/; // Simple 5-digit zip code pattern
            if (!zipCodePattern.test(inputElement.value.trim())) {
                displayError(inputElement, 'Please enter a valid 5-digit Zip Code.');
                isValid = false;
            }
        }
        return isValid;
    };

    const updateCharCounter = (textareaId, counterId) => {
        const textarea = document.getElementById(textareaId);
        const counter = document.getElementById(counterId);
        if (textarea && counter) {
            counter.textContent = textarea.value.length;
        }
    };

    // Attach validation listeners to inputs
    generateForm.querySelectorAll('input, textarea').forEach(input => {
        if (input.id in inputErrors || input.hasAttribute('required')) {
            input.addEventListener('blur', () => validateInput(input));
            // Real-time validation for character counters
            if (input.id === 'services') {
                input.addEventListener('input', () => updateCharCounter('services', 'services-char-count'));
            }
            if (input.id === 'towns') {
                input.addEventListener('input', () => updateCharCounter('towns', 'towns-char-count'));
            }
        }
    });

    generateForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        let formIsValid = true;
        const allInputs = generateForm.querySelectorAll('input, textarea');
        allInputs.forEach(input => {
            if (!validateInput(input)) {
                formIsValid = false;
            }
        });

        if (formIsValid) {
            formErrorDisplay.textContent = '';
            // If form is valid, typically send data to server
            // For now, simulate success or show loading
            document.getElementById('loading-indicator').style.display = 'block';
            console.log('Form Submitted Successfully (Simulated)!');
            // Here you would typically send data to your server via fetch API
            // Example:
            /*
            fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessName: document.getElementById('businessName').value,
                    zipCode: document.getElementById('zipCode').value,
                    services: document.getElementById('services').value,
                    towns: document.getElementById('towns').value,
                    enableAICopy: document.getElementById('enableAICopy').checked,
                    aiStyle: document.getElementById('ai-style').value
                }),
            })
            .then(response => response.json())
            .then(data => {
                // Handle success response
                document.getElementById('loading-indicator').style.display = 'none';
                console.log('Success:', data);
                // Redirect or show success message
            })
            .catch((error) => {
                // Handle error
                document.getElementById('loading-indicator').style.display = 'none';
                formErrorDisplay.textContent = 'An error occurred during generation.';
                console.error('Error:', error);
            });
            */
        } else {
            formErrorDisplay.textContent = 'Please correct all errors before submitting.';
        }
    });

    // Initialize character counters
    updateCharCounter('services', 'services-char-count');
    updateCharCounter('towns', 'towns-char-count');
});