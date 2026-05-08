document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/stripe-public-key');
        const { publicKey } = await response.json();
        const stripe = Stripe(publicKey);

        const forms = document.querySelectorAll('form[action="/api/checkout"]');

        forms.forEach(form => {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();

                const creditPackId = form.querySelector('input[name="creditPackId"]')?.value;
                const agencyPlanId = form.querySelector('input[name="agencyPlanId"]')?.value;

                const body = {};
                if (creditPackId) {
                    body.creditPackId = creditPackId;
                } else if (agencyPlanId) {
                    body.agencyPlanId = agencyPlanId;
                } else {
                    console.error('No valid plan or pack selected.');
                    return;
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
                        const { sessionId } = await response.json();
                        stripe.redirectToCheckout({ sessionId });
                    } else {
                        const { message } = await response.json();
                        console.error('Checkout error:', message);
                        // Display an error message to the user
                    }
                } catch (error) {
                    console.error('Error:', error);
                    // Display an error message to the user
                }
            });
        });
    } catch (error) {
        console.error('Error fetching Stripe public key:', error);
    }
});
