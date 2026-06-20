# BACKLOG.md — LocalLeads Prioritized Tasks

## Priority Legend
- **P0** = Blocking / Must do this session
- **P1** = Important / Do this week
- **P2** = Nice-to-have / Backlog

---

## 🔥 IMMEDIATE (P0)
- None.

## 🚀 MARKETING & GROWTH (P1)
- **Agency Client Portal / Shared Reporting Link**: Build a passwordless shared view endpoint (e.g., `/share/[client-hash]`) allowing agencies to share dynamic keyword ranking trackers, leads count, and page listings directly with their local business clients in a read-only white-labeled dashboard view.
- **Custom Domain SSL & Health Status Panel**: Extend DNS verification utilities to analyze pointed CNAME domains and verify active SSL certificate generation, displaying status warnings when subdomains are not resolving correctly.

## ⚙️ INFRASTRUCTURE & UX (P2)
- **Interactive Page SEO Checklist**: Implement a page-level checklist modal inside `dashboard.html` inspecting alt tags, header tag counts (H1/H2), title length, keyword density, and schema presence for any selected generated local page, showing a visual SEO score.

---

## ✅ COMPLETED
- ✅ C157: Fixed database events schema mismatch by ensuring `timestamp` column exists in `user_events` migration and running ALTER TABLE statement (Session 326, June 20, 2026).
- ✅ C156: Packaged and filed Chrome Web Store submission for 1-Click Local SEO Audit Extension (Session 303, Session 323, June 19, 2026).
- ✅ C150-C155: Workspace QA verification, compliance audit, Blog Search & Category Filter Redesign, Directory Profile Lead Capture Form & Claiming Automation, and comprehensive backend tests for directory profile and claiming endpoints (Session 314 - Session 320, June 19, 2026).
- ✅ C146-C149: Local Keyword Rankings Tracker, Captured Leads CSV Export, Referral Program Leaderboard, and Rankings Tracker bulk CSV import (Session 307 - Session 313, June 19, 2026).
- ✅ C132-C145: Chrome Extension packaging/graphics, SendGrid/Stripe help requests, homepage extension promotion, conversion optimization, signup referral auto-population, social posting GBP, DNS guide, GSC alerts (Session 299 - Session 306, June 13 - June 18, 2026).
- ✅ C83-C131: GBP OAuth reviews sync, AI FAQ/Schema/Social post generator, Case studies, Locked leads drips, Venn gaps, Competitors gap, GSC check (Session 175 - Session 298, June 10 - June 12, 2026).
- ✅ C1-C82: Core features, Stripe integration, KV & PostgreSQL DB migration, white-label branding, billing lockout, custom domains, webhooks (April - June 10, 2026).
