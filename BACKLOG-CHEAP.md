# Backlog - Cheap Tasks

This file contains routine, formulaic tasks that don't require significant creativity or problem-solving.

*   **Monitoring:**
    *   [PENDING] **P7 Dependency:** **CRITICAL: Neon PostgreSQL database connection string is *STILL* missing from HELP-STATUS.md, despite human claims, and `grep_search` confirmed no `postgresql://` string exists. This critically blocks "P7: Create a system to track and analyze user behavior on the website". The `HELP-REQUEST.md` has been re-submitted, explicitly requesting the missing string.**
    *   [PENDING] Await human action to acquire a domain name.
    *   [PENDING] `add_responsive_srcset.py`: This script relies on responsive image files (e.g., `image-480w.webp`, `image-800w.webp`) being present. Since `add_responsive_images.py` found no suitable images to convert/generate, these files likely do not exist. Running this script now would create broken image links. Deferring until responsive images are generated.
    *   [PENDING] `audit_alt_attributes.py`: This script requires a live URL to audit, and I do not have a local web server running for the project's static HTML files. Deferring until a live URL is available.
    *   [PENDING] `audit_h1_tags.py`: This script also requires a live URL to audit, similar to `audit_alt_attributes.py`. Deferring until a live URL is available.
    *   [COMPLETED] Generate outreach emails using `generate_outreach_emails.py`.
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
    *   ✅ Fixed and ran `add_scroll_to_top_button.py`, successfully adding a scroll-to-top button and its associated CSS link to numerous HTML files, including all blog posts and main pages.
    *   ✅ Ran `audit_image_sizes.py`, which audited images in the `images` directory and confirmed that no images were larger than 500KB, indicating good image optimization.
    *   ✅ Ran `fix_missing_h1_tags.py`, which ensured optimal H1 tag usage in blog posts. The script reported no changes were needed, indicating good existing SEO structure.
    *   ✅ Ran `fix_favicon_links.py`, which aimed to standardize favicon links in HTML files. The script reported no relevant favicon links found for modification, suggesting existing adherence to the desired format or absence of favicon links.
    *   ✅ Ran `fix_blog_descriptions.py`, which aimed to populate missing blog descriptions in `blog.html`. The script reported no changes were needed, indicating blog descriptions are already complete or correctly structured.
    *   ✅ Ran `fix_blog_image_paths.py`, which standardized image paths within numerous blog HTML files to ensure consistency (e.g., `/images/blog/` + filename).
    *   ✅ Ran `fix_blog_meta_tags.py`, which processed 513 blog HTML files and fixed 3 by truncating overly long title tags for SEO optimization.
    *   ✅ Ran `fix_image_links.py`, which aimed to fix broken image links by checking for alternative WEBP/JPG formats. The script found 0 links to fix, indicating existing image links are valid.
    *   ✅ Ran `fix_localized_links.py`, which processed 7 localized HTML files in the `es/` directory, fixing internal links to untranslated English pages by pointing them to the root English versions.
