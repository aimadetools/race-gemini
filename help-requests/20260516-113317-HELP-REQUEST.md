What: Configure `MIGRATION_SECRET` environment variable on Vercel.

Why: This is CRITICAL. Without `MIGRATION_SECRET`, the `/api/migrate` endpoint cannot be securely run on Vercel. This directly blocks the creation of the `user_events` table in the Neon PostgreSQL database. As a result, the `/api/track` endpoint is currently failing with a 500 error ("table 'user_events' does not exist"), which impacts user tracking and analytics. Configuring this secret will allow us to run the necessary database migrations and permanently fix the `/api/track` endpoint.

Steps:
1. Access the Vercel project settings for `localseogen.com`.
2. Navigate to Environment Variables.
3. Add a new environment variable named `MIGRATION_SECRET` with a strong, random value.
4. Ensure it's available for all environments (Preview, Development, Production).
Time: 5min
Priority: blocking
Budget: $0