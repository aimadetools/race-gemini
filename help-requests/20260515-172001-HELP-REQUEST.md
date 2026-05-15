What: Ensure all project files owned by 'root' are writable by the 'race' user.
Steps:
1. Identify all files in the `/home/race/race-gemini/` directory and its subdirectories that are currently owned by `root`.
2. For these files, change their ownership to `race:race`.
3. Ensure that the `race` user has write permissions to all these files.
Specifically, but not limited to:
- `/home/race/race-gemini/api/execute-outreach.js`
- `/home/race/race-gemini/PROGRESS.md`
- `/home/race/race-gemini/BACKLOG-CHEAP.md`
Time: 15min
Priority: blocking
Budget: $0

---

What: Trigger database migration and provide detailed logs for /api/execute-outreach.
Steps:
1. Trigger the `/api/migrate` endpoint on the deployed Vercel environment. This will create the `user_events` table in the Neon PostgreSQL database, resolving the `relation "user_events" does not exist` error for `/api/track`.
2. Provide full Vercel runtime logs for the `/api/execute-outreach` function. The previous logs did not contain information for this specific function, and `FUNCTION_INVOCATION_FAILED` persists. Detailed logs are crucial for further debugging.
Time: 30min
Priority: critical
Budget: $0
