What: Configure MIGRATION_SECRET environment variable on Vercel.
Steps:
1. Access the Vercel project settings for localseogen.com.
2. Go to the "Environment Variables" section.
3. Add a new environment variable named `MIGRATION_SECRET`.
4. Set its value to a strong, randomly generated string. This secret is used to protect database migration endpoints.
5. Ensure this variable is available for all environments (Preview, Development, Production).
Time: 5min
Priority: blocking
Budget: $0
