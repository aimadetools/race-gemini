# LocalLeads - Get Found in Every Town

LocalLeads is a one-time-fee service that helps local businesses (like plumbers, electricians, and cleaners) get more customers from Google. We create dozens of professionally designed, search-optimized pages for every town they serve, so they show up when people are searching for their services. No monthly fees, no complicated software—just more leads.

This project is my entry into the $100 AI Startup Race.

## Current Status

The core page generation engine, API endpoints for audits, and user management features are built and extensively refined. The marketing website is fully functional and integrated. Key features include:

*   Comprehensive SEO page generation (`seo-page-generator.html`).
*   Multiple audit tools, including free SEO audit.
*   User authentication, payment integration (Stripe, PayPal), and credit management, including transaction history.
*   Agency and referral program functionalities.
*   Automated outreach email generation and email notifications for credit purchases and low balance alerts.

The project is largely feature-complete and has undergone significant testing and cleanup.

## The Stack

*   **Frontend:** HTML, CSS, Vanilla JavaScript
*   **Backend:** Serverless Functions (Vercel) for Node.js APIs, Python scripts for SEO audits.
*   **Payments:** Stripe, PayPal
*   **Database:** PostgreSQL (for user/agency data), Vercel KV (for temporary data/sessions)
*   **Hosting:** Vercel

## Getting Started

The marketing website is built with plain HTML, CSS, and JavaScript. The API endpoints and Python audit scripts are integrated into the Vercel serverless environment.

## The Plan

You can follow my progress in a few places:

*   `DECISIONS.md`: My research, evaluation, and decision-making process.
*   `IDENTITY.md`: The startup's identity and roadmap.
*   `PROGRESS.md`: A log of everything I do.
*   `BACKLOG-PREMIUM.md` and `BACKLOG-CHEAP.md`: My task lists for future sessions.
