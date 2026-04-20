# Usage-Based Pricing Proposal: Page Credit Packs

## Proposed Model: Page Credit Packs

Customers purchase packs of page credits. Each credit is equivalent to one generated page. The cost per credit decreases with larger packs, offering volume discounts. Credits do not expire. This model retains the "one-time payment" appeal while providing more flexibility and granularity than fixed-page packages.

## Proposed Tiers:

*   **Small Business Pack:** 50 Page Credits for $50 ($1.00/page)
*   **Pro Pack:** 200 Page Credits for $180 ($0.90/page) - *10% discount*
*   **Agency Pack:** 1000 Page Credits for $800 ($0.80/page) - *20% discount*
*   **Enterprise Pack:** Custom pricing for >1000 pages (requires manual quote).

## Implementation Steps:

### Frontend Changes:

1.  **Pricing Page (`pricing.html`):**
    *   Update the UI to display "Page Credit Packs" instead of fixed page counts.
    *   Modify "Choose" buttons to initiate the purchase of the respective credit pack.
    *   Potentially add an input field for custom credit amounts that calculates the price based on tiers.

2.  **Generate Page (`generate.html`):**
    *   Display the user's current credit balance.
    *   If a user tries to generate pages exceeding their credits, prompt them to purchase more credits.
    *   Integration with Customer Authentication (currently blocked) would be required to retrieve user's credit balance. For now, this would be a future enhancement.

### Backend Changes:

1.  **Stripe Product Setup:**
    *   Create new Stripe Products for "Page Credits" with corresponding Price IDs for each pack (50, 200, 1000 credits).

2.  **`api/checkout.js`:**
    *   Modify the `checkout` API to accept `creditPackId` instead of `priceId`.
    *   When a `creditPackId` is received, lookup the corresponding Stripe `priceId` for the credit pack.
    *   Create a Stripe Checkout Session for the credit pack purchase.

3.  **`api/webhook.js`:**
    *   Enhance the `webhook` API to handle successful payment events for credit packs.
    *   **Crucially, this requires a database to store user credit balances.**
    *   Upon `checkout.session.completed` event for a credit pack, add the purchased credits to the user's balance in the database.
    *   If no user database is available, credits cannot be stored persistently, making this model difficult to implement beyond a proof-of-concept. For an initial version without a database, a temporary "session" credit could be imagined, but this wouldn't be robust.
    *   **Current Blockage:** The lack of PostgreSQL database credentials directly impacts the persistent storage of user credit balances. This is a critical dependency.

4.  **`api/generate.js`:**
    *   Modify the `generate` API to check the user's available page credits (requires Customer Authentication and database access).
    *   If sufficient credits, deduct `servicesArray.length * townsArray.length` credits from the user's balance.
    *   If insufficient credits, return an error and suggest purchasing more.
    *   **Current Blockage:** This requires persistent user credit storage (database) and user identification (authentication).

## Conclusion:

The "Page Credit Packs" model is a viable evolution towards usage-based pricing, aligning well with the current one-time payment structure. However, **its robust implementation is critically dependent on having a functional database for storing user credit balances and a customer authentication system to identify users.** Without these, only a very limited or temporary implementation is feasible.
