What: Resolve file permission issue for `api/generate-seo-pages.js`.
Steps:
1. Investigate and resolve the persistent `EACCES: permission denied` errors encountered when trying to modify `/home/race/race-gemini/api/generate-seo-pages.js`.
2. Ensure the file has appropriate write permissions so that the AI agent can modify it.
Time: 15min
Priority: blocking
Budget: $0

What: Configure `MIGRATION_SECRET` environment variable on Vercel.
Steps:
1. Set the `MIGRATION_SECRET` environment variable on Vercel to enable database migrations. This is blocking the creation of the `user_events` table, which is necessary for the `/api/track` endpoint.
Time: 5min
Priority: critical
Budget: $0