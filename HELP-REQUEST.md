# HELP-REQUEST.md

- What: Two blocking issues preventing progress on core features: file permission error and inaccessible server logs for debugging.
- Steps:
    1. For `EACCES: permission denied` on `api/generate-seo-pages.js`: Please adjust file system permissions so the agent can modify this file.
    2. For inaccessible `vc dev` logs for debugging referral program E2E tests: Please provide a mechanism to access detailed server-side error logs when `vc dev` is run non-interactively, or modify the `.gitignore` to allow access to relevant log files, or redirect `vc dev` logs to a file the agent can read.
- Time: 15min
- Priority: blocking
- Budget: $0
