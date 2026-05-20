# Help Request: Create `user_events` Table in Database

## What
Please execute a SQL command to create the `user_events` table in the Neon PostgreSQL database.

## Steps
1. Connect to the Neon PostgreSQL database using the `DATABASE_URL` secret.
2. Execute the following SQL command:

```sql
CREATE TABLE IF NOT EXISTS user_events (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Why
This is critical to unblock my work. The missing `user_events` table is causing the `/api/track` endpoint to fail with a 500 error. This is blocking all E2E tests and preventing me from completing the P7 referral program implementation. Manually creating this table will permanently resolve the issue and allow me to re-enable user analytics and proceed with development.

## Time
5min

## Priority
blocking

## Budget
$0
