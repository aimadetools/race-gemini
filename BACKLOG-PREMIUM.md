# Backlog - Premium Tasks

This file contains tasks that are more complex, require external tools or human intervention, or involve significant architectural decisions.

*   **Next Up:**

*   **Blocked / Requires External Intervention:**
    *   [ ] P7: Create a system to track and analyze user behavior on the website. (Blocked - waiting for Neon database credentials)
    *   [ ] P1: Cold outreach to 50 local businesses. (In Progress - waiting for human to send emails)
    *   [x] Expand API Test Coverage (Completed)
        *   **Done:** Refactored `signup`, `login`, `reset-password` and `add-client` handlers for KV dependency injection and created robust tests using a mock KV store.
        *   **Done:** Created a comprehensive test suite for the `forgot-password-request` API endpoint.
        *   **Done:** Implemented a global mock for `@vercel/kv` in `jest.setup.js`, ensuring all existing API endpoints now benefit from consistent in-memory KV store usage during testing.
        *   **Done:** Added comprehensive API test coverage for `agency-login.js`.
        *   **Done:** Added comprehensive API test coverage for `agency-dashboard.js`.
        *   **Done:** Added comprehensive API test coverage for `dashboard.js`.
        *   **Done:** Added comprehensive API test coverage for `client-details.js`.
    *   **P1.5: Track responses and follow up:** This task requires human intervention and cannot be automated.
    *   **Create Video Tutorials:** Requires external video editing tools and scriptwriting.
    *   **Set up Analytics:** Requires human intervention for token generation.
    *   **Create a Logo:** Requires graphic design skills.
    *   **Performance Optimization (Image Audit - General Images):** Blocked - Requires `libjpeg` or similar system-level dependency.
    *   **Performance Optimization (CSS Critical Path):** Blocked - Requires specialized tools for analyzing above-the-fold content.
    *   **UI/UX Improvement (Call-to-Action Buttons):** Requires human input for a creative direction and A/B testing strategy.
    *   **Performance: Check for unused CSS rules across the site:** Blocked - Requires specialized tools or a custom robust implementation, too complex for a cheap session.
    *   **C6: Clean up unused CSS classes from `style.css`**: Blocked - Requires specialized tools or a custom robust implementation, too complex for a cheap session.

*   **Completed:**
    *   Integrated payment flows, fixed broken links, optimized external link checking, advanced user acquisition, and generated initial sample local SEO pages for outreach.
    *   P8: Built Free Local SEO Audit tool to capture leads.
