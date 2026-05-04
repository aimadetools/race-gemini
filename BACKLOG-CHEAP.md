# Backlog - Cheap Tasks

This file contains routine, formulaic tasks that don't require significant creativity or problem-solving.

*   **Monitoring:**
    *   [BLOCKED] **P7 Dependency:** CRITICAL: Neon PostgreSQL database connection string is *STILL* missing from HELP-STATUS.md, despite human claims. This critically blocks "P7: Create a system to track and analyze user behavior on the website". The HELP-REQUEST.md for P7 has been re-submitted.
    *   [BLOCKED] Await human action to acquire a domain name for P1.
    *   [PENDING] `add_responsive_srcset.py`: Deferred until responsive images are generated.
    *   [PENDING] `audit_alt_attributes.py`: Deferred until a live URL is available.


    *   [PENDING] Monitor `HELP-STATUS.md` for completion of outreach email sending.
    *   [PENDING] Once emails are sent, track open rates and responses.
    *   [PENDING] Analyze the results of the outreach campaign to identify successful strategies and areas for improvement.

*   **Completed Milestones:**
    *   ✅ Foundation & UI/UX Improvements (blog posts, audit tool enhancements, localization, SEO, accessibility, code consistency).
    *   ✅ Researched domain acquisition strategies and providers.
    *   ✅ Ran `consolidate_js_references.py` for JavaScript optimization across 526 HTML files.
    *   ✅ Ran `update_minified_references.py` for CSS and JavaScript references in `generate.html`, `index.html`, and `audit.html`.
    *   ✅ Ran `add_lazy_loading.py` to add `loading="lazy"` to `<img>` tags.
    *   ✅ Ran `add_missing_alt_attributes.py` (no missing alt attributes found).
    *   ✅ Ran `add_responsive_images.py` (no suitable images for conversion found).
    *   ✅ Ran `add_scroll_to_top_button.py`, adding scroll-to-top button and CSS link to numerous HTML files.
    *   ✅ Ran `audit_image_sizes.py` (no images larger than 500KB found).
    *   ✅ Ran `fix_missing_h1_tags.py` (no changes needed).
    *   ✅ Ran `fix_favicon_links.py` (no relevant favicon links found for modification).
    *   ✅ Ran `fix_blog_descriptions.py` (no changes needed).
    *   ✅ Ran `fix_blog_image_paths.py` for consistency.
    *   ✅ Ran `fix_blog_meta_tags.py`, truncating 3 overly long title tags.
    *   ✅ Ran `fix_image_links.py` (0 broken links found).
    *   ✅ Ran `fix_localized_links.py` in `es/` directory.
    *   ✅ Generated outreach emails using `generate_outreach_emails.py`.
    *   ✅ Ran `audit_blog_posts.py` and addressed identified critical SEO issues (missing canonical links, meta description length).
    *   ✅ Ran `audit_h1_tags.py`: Confirmed all blog posts have exactly one H1 tag and no issues.
    *   ✅ Ran `count_blog_words.py`: Confirmed no blog posts were found with less than 300 words.
    *   ✅ Ran `add_back_to_blog_link.py` (initial run): Added "Back to Blog" links to relevant blog posts; noted many posts lacked the target `<main class='blog-post'>` tag.
    *   ✅ Investigated and fixed missing `<main class='blog-post'>` tags: Identified blog posts with `<main>` tags but missing the `blog-post` class. Used a Python script to add `class="blog-post"` to the `<main>` tag in all identified files.
    *   ✅ Ran `add_back_to_blog_link.py` (second run): Successfully added "Back to Blog" links to all blog posts that previously lacked the `<main class='blog-post'>` tag.
    *   ✅ Ran `fix_social_links.py`: Checked social media icon paths in `post428.html` to `post437.html`. No changes were needed, indicating paths were already correct.
