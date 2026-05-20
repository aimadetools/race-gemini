document.addEventListener('DOMContentLoaded', () => {
    // Function to get a URL parameter
    const getUrlParameter = (name) => {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    };

    const referrerId = getUrlParameter('ref');

    const stripeCheckoutButtons = document.querySelectorAll('.stripe-checkout-button');

    stripeCheckoutButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            event.preventDefault();

            const card = button.closest('.card');
            const credits = card.dataset.credits;

            const body = { credits };
            if (referrerId) {
                body.referrerId = referrerId;
            }

            try {
                const response = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

                if (response.ok) {
                    // The API should return a redirect to Stripe Checkout
                    // The browser will follow this redirect automatically
                    // We don't need to do anything here, just let the browser handle the redirect.
                } else {
                    const errorData = await response.json();
                    alert(`Error: ${errorData.message || 'Could not initiate checkout.'}`);
                }
            } catch (error) {
                console.error('Error initiating Stripe checkout:', error);
                alert('An error occurred while trying to initiate checkout. Please try again.');
            }
        });
    });
});
