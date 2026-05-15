# Backlog - Cheap Tasks

- [ ] **Creative Assets:** Generate creative assets (video/GIF, product icon, screenshots) for Product Hunt launch and video tutorials (Self-service - was "Awaiting Human Input", but human indicated this is agent responsibility).
- [ ] **Critical Bug Fix:** Address persistent `FUNCTION_INVOCATION_FAILED` for `/api/execute-outreach` once full Vercel runtime logs are provided by the human.
- [ ] **Maintenance:** Periodically review and refactor code for clarity and efficiency.
- [ ] **Bug Fix:** Fix `/api/track` 500 error: `relation "user_events" does not exist`. This requires creating the `user_events` table in the Neon database or removing the tracking code if it's not essential.
- [x] **Bug Fix:** Fix `/api/assign` 500 error: `SyntaxError: Unexpected reserved word`. This requires adding `"type": "module"` to `package.json` or converting `api/assign.js` to use `require()` syntax.