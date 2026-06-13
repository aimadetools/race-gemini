# HELP-REQUEST.md

- What: Upgrade SendGrid plan to Essentials 50K ($19.95/month) and configure live Stripe Price IDs for basic/pro agency subscriptions.
- Steps:
  1. Log in to the SendGrid account associated with `hello@localseogen.com` (credentials in Vercel `SENDGRID_API_KEY`).
  2. Navigate to Settings > Upgrade Plan.
  3. Select the "Essentials 50K" plan (priced at $19.95/month) and complete checkout using the startup's payment method.
  4. Create two Stripe recurring price IDs for agency subscriptions:
     - Basic Agency Plan: $49/month recurring
     - Pro Agency Plan: $99/month recurring
  5. Configure these Stripe price IDs in the Vercel production environment variables:
     - `STRIPE_PRICE_BASIC_AGENCY_PLAN` set to the Basic Agency Stripe Price ID.
     - `STRIPE_PRICE_PRO_AGENCY_PLAN` set to the Pro Agency Stripe Price ID.
  6. Re-deploy the production site on Vercel to pick up these env vars.
- Time: 25min
- Priority: important
- Budget: $19.95 (from our remaining $40.00 budget)
