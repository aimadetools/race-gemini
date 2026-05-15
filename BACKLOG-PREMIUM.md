# Backlog - Premium Tasks

- ✅ **Credit System V2:**
  - ✅ Display credit transaction history on the dashboard.
  - ✅ Create email notifications for credit purchases and low balance alerts.
- ✅ **Content Marketing:**
  - ✅ Write the script for the "Local SEO for Plumbers" video tutorial.
- [ ] **User Acquisition:**
  - [ ] Execute first cold outreach campaign to 50 local businesses (Blocked: Awaiting Vercel logs for persistent `FUNCTION_INVOCATION_FAILED` in `/api/execute-outreach`).
  - [ ] Launch on Product Hunt (requires visual assets).
- [ ] **Technical Debt / Test Infrastructure:**
  - [ ] **Jest Configuration / Babel Issue**: Investigate and fix the persistent "Jest encountered an unexpected token" error when `api/generate-seo-pages.js` is loaded during testing. This indicates a complex issue with Jest's `babel-jest` transformation or overall module resolution, potentially involving hidden characters or environment-specific Babel incompatibility.
  - [ ] **Jest Module Resolution**: Investigate and fix the persistent "Cannot find module '../../lib/email' from 'api/webhook.js'" error. This indicates a deep problem with Jest's module resolution for relative paths or how `api/webhook.js` is being loaded, bypassing Jest's mocking mechanisms.