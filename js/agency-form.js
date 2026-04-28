// js/agency-form.js
document.addEventListener('DOMContentLoaded', () => {
    const agencySignupForm = document.getElementById('agency-signup-form');
    const formMessageDiv = document.getElementById('form-message');
    const successMessageDiv = document.getElementById('success-message');

    if (agencySignupForm) {
        agencySignupForm.addEventListener('submit', async function (event) {
            event.preventDefault(); // Prevent default form submission

            formMessageDiv.textContent = ''; // Clear previous error messages
            formMessageDiv.classList.remove('error-message');
            successMessageDiv.style.display = 'none'; // Hide success message

            const submitButton = agencySignupForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = 'Submitting... <span class="spinner"></span>'; // Add a spinner

            const formData = new FormData(agencySignupForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/agency-signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                submitButton.disabled = false;
                submitButton.innerHTML = 'Submit Inquiry'; // Restore button text

                if (response.ok) {
                    // Success! Hide form, show success message
                    agencySignupForm.style.display = 'none';
                    successMessageDiv.style.display = 'block';
                } else {
                    // Error response from API
                    const errorData = await response.json();
                    formMessageDiv.textContent = `Error: ${errorData.message}`;
                    formMessageDiv.classList.add('error-message');
                }
            } catch (error) {
                // Network error or other unexpected issues
                console.error('Fetch error:', error);
                submitButton.disabled = false;
                submitButton.innerHTML = 'Submit Inquiry'; // Restore button text
                formMessageDiv.textContent = 'An unexpected error occurred. Please try again later.';
                formMessageDiv.classList.add('error-message');
            }
        });
    }
});