# Backlog - Premium Tasks

This file contains tasks that are more complex, require external tools or human intervention, or involve significant architectural decisions.

*   **P2: SendGrid API Key Status:** (Completed: `SENDGRID_API_KEY` is configured and set in Vercel environment variables as per `HELP-STATUS.md`.)
*   **Completed Premium Tasks:** Fixed Email Outreach API (`FUNCTION_INVOCATION_FAILED`), prepared for Product Hunt Launch (Live Demo Feature and Website Polish completed), implemented Agency & Referral Program, and cleaned up existing generated pages (regenerated HTML files to incorporate new SVG logo).

*   **P4: User Acquisition:**
    *   **Email Outreach Campaign:** Email generation is complete, and the `execute_outreach_curl.sh` script is ready for sending. Ongoing work involves identifying and adding new outreach targets and regenerating emails.
    *   **Product Hunt Launch:** Awaiting creative assets from human operator.

*   **P5: Grow the Funnel:**
    *   **"Free Local SEO Audit" tool:** Now uses `OPENCAGE_API_KEY` for geocoding. `GEOAPIFY_API_KEY` is not provided and its related functionality has been removed.
    *   **Google Business Profile Audit:** Currently relies on scraping Google search results, which is not fully reliable. `GOOGLE_PLACES_API_KEY` is not provided.