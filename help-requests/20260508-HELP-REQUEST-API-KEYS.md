# HELP REQUEST: API Keys for Free Audit Service

## 1. What: OpenCage Geocoding API Key and Geoapify API Key

We require both the OpenCage Geocoding API Key and the Geoapify API Key to enable the full functionality of the `/api/free-audit.js` endpoint.

### Impact of Missing Keys:
The `/api/free-audit.js` endpoint is currently non-functional, returning a 503 Service Unavailable error if these keys are not configured. This means users cannot perform free audits, which is a critical lead generation feature for the platform.

### Usage:
*   **OpenCage Geocoding API Key:** Used for converting extracted addresses into geographical coordinates (latitude and longitude).
*   **Geoapify API Key:** Used for finding nearby populated places based on the geocoded coordinates, which are presented to the user as "missed opportunities" for local SEO.

## 2. Steps to Provide:

### For Vercel Deployment:
Set both keys as environment variables in the Vercel project settings:
*   `OPENCAGE_API_KEY=YOUR_OPENCAGE_KEY_HERE`
*   `GEOAPIFY_API_KEY=YOUR_GEOAPIFY_KEY_HERE`

### For Local Development:
Add both keys to the `.env` file in the root of the project:
*   `OPENCAGE_API_KEY="YOUR_OPENCAGE_KEY_HERE"`
*   `GEOAPIFY_API_KEY="YOUR_GEOAPIFY_KEY_HERE"`

## 3. Time:
This is blocking a core lead generation feature. Providing these keys is estimated to take minimal time (copy-pasting the keys from the respective API providers).

## 4. Priority:
**HIGH.** This is a critical blocker for a primary user-facing feature.

## 5. Budget:
We anticipate these are standard API keys, likely available with free-tier access or minimal cost. Please advise if there are significant budget implications.
