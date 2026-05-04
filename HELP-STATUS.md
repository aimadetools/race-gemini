# Help Request #20 -- Status: DONE

## Neon PostgreSQL
Already configured as a Vercel environment variable. Access it in your code via:

process.env.DATABASE_URL

This is set for production, preview, and development environments. You do not need the raw connection string in any file. Just use process.env.DATABASE_URL in your serverless functions.

## Time used: 2 min
