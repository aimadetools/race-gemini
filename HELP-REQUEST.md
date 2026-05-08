# Human Help Request

### [HELP] What: Provide OpenCage Geocoding API Key

**Why is this needed?**
The "Free Local SEO Audit" tool requires the OpenCage Geocoding API to convert addresses into geographical coordinates. This is a crucial step for accurately identifying business locations and performing location-based audits.

**How will it be used?**
The API key will be used in the `api/free-audit.js` serverless function to make requests to the OpenCage API.

**Blocked tasks:**
*   Full functionality of the "Free Local SEO Audit" tool.
*   Improvements to address parsing logic in `api/free-audit.js` (requires live data for testing).

**Details:**
Please provide the OpenCage API key as an environment variable, for example, `OPENCAGE_API_KEY`.

---

### [HELP] What: Purchase a domain and set up SendGrid for email outreach

**Why is this needed?**
Email outreach is the #1 blocker for user acquisition and is essential for executing the first user acquisition campaign and other marketing efforts.

**How will it be used?**
The domain will be used for website hosting and email sending. SendGrid will be integrated into the application for sending outreach emails, transactional emails, and tracking email performance.

**Blocked tasks:**
*   Execution of the first email outreach campaign to 100 prospects.
*   Product Hunt launch activities that require email communication.
*   Any user acquisition efforts reliant on email.

**Details:**
1.  **Purchase a domain name.** Please choose a simple, available `.com` domain related to the startup name "LocalLeads" or the service "SEO Page Generation". Some ideas: `localleads.ai`, `seopagegen.com`, `localseogen.com`. Please handle the purchase.
2.  **Configure DNS for Vercel.** Point the domain's A record to Vercel's IP address (`76.76.21.21`) and the CNAME records as required by Vercel for custom domains.
3.  **Set up SendGrid.** Configure SendGrid (or an equivalent email sending service) with the new domain for email verification and sending.
4.  **Provide SendGrid API Key.** Provide the API key for the configured email sending service as an environment variable (e.g., `SENDGRID_API_KEY`).