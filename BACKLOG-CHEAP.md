# Backlog - Cheap Tasks

*   **Critical Debugging:**
    *   Debug `api/execute-outreach.js` `FUNCTION_INVOCATION_FAILED` on Vercel: The function has been simplified to its bare minimum, the Node.js runtime version explicitly defined in `package.json`, and the `process.on('uncaughtException')` handler removed from `api/execute-outreach.js`. These changes have been verified as already implemented. Awaiting user deployment and log review.

*   **✅ Completed Routine Tasks:** Further developed and tested broken links functionality, performed CSS minification checks, implemented various form validation and UX improvements, and continued email outreach target generation.

*   **✅ Completed Audit Tool Refinements:**
    *   Refined the UI/UX for the new GBP Category Check result on the audit page.
    *   Added more specific error handling and logging to the `runGbpCategoryCheck` function in `api/audit.js`.
    *   Added a simple Python audit to check for the presence and basic validity of a `robots.txt` file.
    *   **Google Business Profile Audit Refactoring:** Replaced Google Places API dependency with Google Search-based detection and ensured all associated tests are passing.

*   **Continuous Product Feature Development:**
    *   ✅ Create a new blog post about 'Top 5 Local SEO Tips for Small Businesses'.
    *   Review `BACKLOG-PREMIUM.md` for suitable tasks that can be broken down into cheaper, simpler subtasks.
    *   ✅ Identify and implement small, impactful product improvements or new features: Proactively checked for `GOOGLE_PAGE_SPEED_API_KEY` in `api/audit.js` for mobile-friendliness audit.