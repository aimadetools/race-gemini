document.getElementById('contact-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const formMessageDiv = document.getElementById('form-message');
    formMessageDiv.textContent = ''; // Clear previous messages
    formMessageDiv.classList.remove('success-message'); // Remove success class if present
    formMessageDiv.classList.remove('error-message'); // Remove error class if present

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = 'Sending... <span class="spinner"></span>';

    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;

        if (response.ok) {
            form.reset();
            formMessageDiv.textContent = 'Your message has been sent successfully!';
            formMessageDiv.classList.add('success-message'); // Add success class for styling
        } else {
            const error = await response.json();
            formMessageDiv.textContent = `Error: ${error.message}`;
            formMessageDiv.classList.add('error-message'); // Add error class for styling
        }
    } catch (error) {
        console.error('Fetch error:', error);
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
        formMessageDiv.textContent = 'An unexpected error occurred. Please try again later.';
        formMessageDiv.classList.add('error-message');
    }
});
