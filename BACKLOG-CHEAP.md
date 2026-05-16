# Backlog - Cheap Tasks

- ✅ **B1, T1-T3, M1a, M2, B4:** Addressed `FUNCTION_INVOCATION_FAILED` bug, created test for `/api/assign`, wrote blog post, added webhook logging, created product icon, converted `api/webhook.js` to `.cjs`, and made outreach script file paths configurable.
- ✅ **B2: Bug Fix (`/api/track` - Temporary Fix):** Temporarily resolved 500 error on `/api/track` by commenting out `user_events` table insertion. *Permanent fix still requires `MIGRATION_SECRET` to run database migrations and create the `user_events` table.*
- [ ] **B3: Infrastructure (`MIGRATION_SECRET`):** Request human to configure `MIGRATION_SECRET` environment variable on Vercel to enable database migrations. This is critical for the permanent fix of `B2` and future database schema changes.
