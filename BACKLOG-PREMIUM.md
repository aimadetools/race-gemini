# Backlog - Premium Tasks

This file contains tasks that are more complex, require external tools or human intervention, or involve significant architectural decisions.

*   **Agency White-Label Solution:** Develop a robust white-label solution for agencies, including a dedicated agency portal, client sub-accounts, custom branding, and streamlined page deployment workflows. (In Progress)
    *   [x] Agency dashboard to view and manage clients.
    *   [x] Ability to add new clients.
    *   [x] Agency login.
    *   [x] Custom branding for agencies. (In Progress)
        *   [x] Agencies can set their logo URL and primary color.
        *   [x] Generated pages are branded with the agency's logo and color.
    *   [x] Agency billing. (In Progress)
        *   [x] Agencies can purchase credits.
        *   [x] Agencies can assign credits to clients.
        *   [x] Agencies can view their billing history.
        *   [x] Agencies can subscribe to a monthly plan.
        *   [x] Agencies can view their subscription status.
        *   [x] Agencies can view their credit assignment history.
*   **Customer Authentication:** Implemented a secure user authentication system (signup, login, password reset). (Completed)
    *   **Signup:** Implemented using `@vercel/kv` and `bcrypt`. (`api/signup.js`, `auth.html`). (Completed)
    *   **Login:** Implemented using `@vercel/kv` and `bcrypt`, `jsonwebtoken`, and `cookie`. (`api/login.js`, `auth.html`). (Completed)
    *   **Dashboard Integration:** Implemented fetching user data and dynamically populating `dashboard.html`. (`api/dashboard.js`, `js/dashboard.js`). (Completed)
    *   **Password Reset:** Implemented password reset functionality (`forgot-password.html`, `reset-password.html`, `api/forgot-password-request.js`, `api/reset-password.js`). (Completed)
*   **Usage-based pricing:** Implement a usage-based pricing model where users purchase credits to generate pages. (Completed)
*   **Create Video Tutorials:** Produce short, engaging video tutorials demonstrating how to use LocalLeads, from page generation to deployment. This requires external video editing tools and scriptwriting. (Requires External Tool/Human Intervention)
*   **Set up Analytics:** Integrate a comprehensive analytics platform (e.g., Google Analytics, Plausible) to track user behavior, traffic sources, and conversion rates. This requires token generation. (Requires Human Intervention)
*   **Create a Logo:** Design a professional and memorable logo for LocalLeads. This requires graphic design skills. (Requires Graphic Design Skills)
*   **Optimize images for faster loading:** (Fully Completed) Conduct an audit of all images on the marketing site (primarily in the `images/` and `images/blog/` directories) and ensure they are optimized for web. This includes:
    1.  Converting all problematic `.jpg` images (empty/invalid placeholders) to `.webp` and updating references, specifically for OG and Twitter meta tags. (Completed)
    2.  Implementing responsive images using `srcset` and `sizes` attributes with `<picture>` elements for blog post images. (Completed)
    3.  Applying `loading="lazy"` to all `<img>` tags not above-the-fold. (Completed)
    4.  Implementing configurable quality settings for generated WEBP images to allow for compression without significant quality loss. (Completed)
    5.  Replacing external placeholder images (`https://via.placeholder.com/`) with actual optimized images where generated. (Completed)
*   **Performance Optimization (Image Audit - General Images):** Conduct an audit of all images outside of blog posts (`images/` directory, excluding `images/blog/` and `images/og_webp/`) to identify any large files or unoptimized formats. Convert `.jpg` and `.png` to optimized `.webp` and update HTML references. (Blocked - Requires `libjpeg` or similar system-level dependency for Pillow to process JPG/PNG files, which cannot be installed in the current environment. Requires human intervention or a different approach.)
*   **Broken Link Check:** Implement a simple check (e.g., Python script) to identify and report broken internal and external links across the entire site. (Blocked - Network limitations in the execution environment prevent reliable checking of external links and absolute internal links that resolve to the base URL. Requires human intervention or a different environment.)
*   **Implement a robust CI/CD pipeline for automated deployments:** Set up automated testing, building, and deployment processes to accelerate development and ensure code quality. (Completed - Basic GitHub Actions workflow for Vercel deployment created)
*   **Integrate AI-powered content generation for page creation:** Explore and implement advanced AI models to automatically generate more diverse and engaging content for the local SEO pages. (Completed - Implemented AI-powered content generation using the Gemini API in `api/generate.js`)
*   **Develop a client portal for managing generated pages:** Create a secure portal where clients can view, edit, and track the performance of their generated pages. (Completed - Initial implementation of viewing generated pages on dashboard with client-side script and basic styling)
*   **Implement A/B testing framework for core landing pages:** Set up an advanced A/B testing system to continuously optimize conversion rates on key pages. (Completed - Basic client-side framework with serverless variant assignment and tracking endpoint implemented)
*   **Expand payment options:** Integrate additional payment gateways to offer more flexibility to users.
    *   **PayPal Integration:** Implemented, and ready for actual API credentials for full functionality.
    *   **Apple Pay Integration:** Integrate Apple Pay as a payment option. (Completed)
*   **Advanced analytics dashboard:** Develop a custom analytics dashboard within the client portal to provide detailed insights into page performance and local search rankings. (Completed)
*   **Multi-language support:** Implement functionality to offer the LocalLeads platform and generated pages in multiple languages to reach a wider international audience. (Proof-of-Concept for static HTML completed)
*   **Performance Optimization (CSS Critical Path):** Investigate and implement techniques to optimize CSS delivery, such as inlining critical CSS, to improve initial page load performance. (Blocked - Requires specialized tools for analyzing above-the-fold content and extracting critical rules, which are not available in this environment. Requires human intervention or a different approach.)
*   **UI/UX Improvement (Call-to-Action Buttons):** Review and improve the wording and visual prominence of key call-to-action (CTA) buttons across the site to increase conversion rates. (Requires Human Input for creative direction and A/B testing strategy).
