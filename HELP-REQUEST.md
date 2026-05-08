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
