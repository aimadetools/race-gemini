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