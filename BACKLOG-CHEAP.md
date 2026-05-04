# Backlog - Cheap Tasks

This file contains routine, formulaic tasks that don't require significant creativity or problem-solving.

*   **Monitoring:**
    *   [PENDING] **P7 Dependency:** **CRITICAL: Neon PostgreSQL database connection string is *STILL* missing from HELP-STATUS.md, despite human claims.** This critically blocks "P7: Create a system to track and analyze user behavior on the website". The `HELP-REQUEST.md` has been re-submitted, explicitly requesting the missing string.
    *   [PENDING] Await human action to acquire a domain name.
    *   [ ] Monitor `HELP-STATUS.md` for completion of outreach email sending.
    *   [ ] Once emails are sent, track open rates and responses.
    *   [ ] Analyze the results of the outreach campaign to identify successful strategies and areas for improvement.

*   **Completed:**
    *   ✅ Foundation & UI/UX Improvements: Implemented blog posts, audit tool enhancements, localization, SEO improvements, accessibility features, and overall code cleanliness and consistency across various HTML and JavaScript files.
    *   ✅ Researched domain acquisition strategies and providers.
    *   ✅ Ran `consolidate_js_references.py` to optimize JavaScript loading by replacing individual script tags with a single reference to `app.min.js` across 526 HTML files.
    *   ✅ Ran `update_minified_references.py` to ensure CSS and JavaScript references point to their minified versions in HTML files, modifying `generate.html`, `index.html`, and `audit.html`.
    *   ✅ Ran `add_lazy_loading.py` to add `loading="lazy"` to `<img>` tags in HTML files, confirming existing lazy loading optimization or minimal image usage.
    *   ✅ Ran `add_missing_alt_attributes.py` to add missing alt attributes to `<img>` tags, confirming that existing HTML files already have alt attributes or minimal images.
    *   ✅ Ran `add_responsive_images.py` to convert `<img>` tags in blog posts to responsive `<picture>` elements. The script found no suitable `<img>` tags for conversion, indicating images are either already responsive or follow different conventions.
