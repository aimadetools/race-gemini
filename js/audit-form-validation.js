document.addEventListener('DOMContentLoaded', function() {
    const auditForm = document.getElementById('auditForm');
    const formErrorDisplay = document.getElementById('form-error-message');
    const formSteps = document.querySelectorAll('.form-step');
    let currentStep = 0;

    const inputErrors = {
        auditBusinessName: 'Business Name is required.',
        auditBusinessAddress: 'Business Address is required.',
        auditServices: 'Services are required.',
        auditTowns: 'Towns are required.',
        auditName: 'Your Name is required.',
        auditEmail: 'A valid Email is required.'
    };

    const validateEmail = (email) => {
        const re = /^(([^<>()\[\]\.,;:\s@"]+(\.[^<>()\[\]\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
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
        } else if (inputElement.id === 'auditEmail' && !validateEmail(inputElement.value)) {
            displayError(inputElement, inputErrors[inputElement.id] || 'Please enter a valid email address.');
            isValid = false;
        }
        // Additional validation for services/towns to prevent just whitespace
        else if ((inputElement.id === 'auditServices' || inputElement.id === 'auditTowns') && inputElement.value.split(',').every(item => item.trim() === '')) {
            displayError(inputElement, inputErrors[inputElement.id] || 'Please enter at least one value.');
            isValid = false;
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
    auditForm.querySelectorAll('input, textarea').forEach(input => {
        if (input.id in inputErrors || input.hasAttribute('required')) {
            input.addEventListener('blur', () => validateInput(input));
            // Real-time validation for character counters
            if (input.id === 'auditServices') {
                input.addEventListener('input', () => updateCharCounter('auditServices', 'auditServices-char-count'));
            }
            if (input.id === 'auditTowns') {
                input.addEventListener('input', () => updateCharCounter('auditTowns', 'auditTowns-char-count'));
            }
        }
    });

    // Multi-step form navigation
    const showStep = (stepIndex) => {
        formSteps.forEach((step, index) => {
            step.classList.toggle('active', index === stepIndex);
        });
        currentStep = stepIndex;
    };

    auditForm.querySelectorAll('.next-step').forEach(button => {
        button.addEventListener('click', () => {
            let stepIsValid = true;
            const currentStepInputs = formSteps[currentStep].querySelectorAll('input, textarea');
            currentStepInputs.forEach(input => {
                if (!validateInput(input)) {
                    stepIsValid = false;
                }
            });

            if (stepIsValid) {
                formErrorDisplay.textContent = ''; // Clear general form error
                showStep(currentStep + 1);
            } else {
                formErrorDisplay.textContent = 'Please correct the errors before proceeding.';
            }
        });
    });

    auditForm.querySelectorAll('.prev-step').forEach(button => {
        button.addEventListener('click', () => {
            formErrorDisplay.textContent = ''; // Clear general form error
            showStep(currentStep - 1);
        });
    });

    auditForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        let formIsValid = true;
        const allInputs = auditForm.querySelectorAll('input, textarea');
        allInputs.forEach(input => {
            if (!validateInput(input)) {
                formIsValid = false;
            }
        });

        if (formIsValid) {
            formErrorDisplay.textContent = '';
            // Simulate form submission success and show results section
            document.getElementById('auditForm').style.display = 'none';
            document.getElementById('auditResults').style.display = 'block';
            console.log('Form Submitted Successfully (Simulated)!');
            // Here you would typically send data to your server
        } else {
            formErrorDisplay.textContent = 'Please correct all errors before submitting.';
        }
    });

    // Initialize character counters
    updateCharCounter('auditServices', 'auditServices-char-count');
    updateCharCounter('auditTowns', 'auditTowns-char-count');
});