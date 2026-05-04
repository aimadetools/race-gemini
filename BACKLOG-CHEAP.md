# Backlog - Cheap Tasks

This file contains routine, formulaic tasks that don't require significant creativity or problem-solving.

*   **Monitoring:**
    *   [MONITORING HUMAN] **P7 Dependency:** CRITICAL: Neon PostgreSQL database connection string is *STILL* missing from HELP-STATUS.md, despite human claims. This critically blocks "P7: Create a system to track and analyze user behavior on the website". The HELP-REQUEST.md for P7 has been re-submitted, and I have clarified the need for it to be *in* `HELP-STATUS.md`. **Further action taken: A new HELP-REQUEST.md has been created to explicitly ask the human to provide the connection string directly, due to ongoing inability to retrieve it from HELP-STATUS.md.**
    *   [MONITORING HUMAN] Await human action to acquire a domain name for P1.
    *   [COMPLETED] `audit_alt_attributes.py`: Modified the script to audit local HTML files and confirmed that no missing or empty alt attributes were found across the project. This confirms all alt attributes are correctly handled.
    *   [PENDING] Monitor `HELP-STATUS.md` for completion of outreach email sending *and* domain acquisition for P1.
    *   [PENDING] Once emails are sent, track open rates and responses.
    *   [PENDING] Analyze the results of the outreach campaign to identify successful strategies and areas for improvement.

*   **Completed Milestones:**
    *   ✅ Foundation & UI/UX Improvements (blog posts, audit tool enhancements, localization, SEO, accessibility, code consistency, JavaScript/CSS optimization, lazy loading, H1 tags, image audits, favicon links, blog descriptions, image paths, meta tags, broken links, localized links, generated outreach emails, sitemap generation, missing blog image generation, `add_responsive_images.py` debugged, modified, and executed to generate responsive image sets for many blog posts).
    *   ✅ Blog Content & Structure Refinements: Canonical links, meta description lengths, H1 tag usage, word counts, "Back to Blog" links, social media paths, and `<main class='blog-post'>` tag consistency across blog posts.
    *   ✅ Ran `add_article_schema.py` and confirmed all blog posts already contain Article schema.
    *   ✅ Generated `blog.html` index with 513 blog post entries using `generate_blog_index.py`.
    *   ✅ `audit_h1_tags.py` completed (no issues found).
    *   ✅ `count_blog_words.py` completed (no issues found).
    *   ✅ Canonical links and meta description lengths addressed in blog posts.
    *   ✅ "Back to Blog" links ensured by fixing `<main class='blog-post'>` tags.
    *   ✅ Fixed incorrect social media paths in blog posts.
    *   ✅ `sitemap.xml` generated.
    *   ✅ Missing blog images generated.
    *   ✅ `add_responsive_images.py` improved to process existing `srcset` attributes.
    *   ✅ `fix_missing_h1_tags.py` applied to all project HTML files.
