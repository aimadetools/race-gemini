import glob
import os
from datetime import datetime

def generate_sitemap(base_url="https://www.localleads.pro/"):
    """
    Generates a sitemap.xml file for the website.
    """
    sitemap_path = "sitemap.xml"
    
    # Exclude directories
    exclude_dirs = ["node_modules", "venv", "venv-responsive-images", "__pycache__", ".git", ".github", ".vercel", "es", "locales", "api", "help-requests", "images", "js", "logs"]

    urls = []
    current_date = datetime.now().strftime("%Y-%m-%d")

    # Static pages (higher priority)
    static_pages = {
        "index.html": {"changefreq": "daily", "priority": "1.0"},
        "generate.html": {"changefreq": "weekly", "priority": "0.8"},
        "blog.html": {"changefreq": "daily", "priority": "0.9"},
        "pricing.html": {"changefreq": "monthly", "priority": "0.7"},
        "about.html": {"changefreq": "monthly", "priority": "0.7"},
        "audit.html": {"changefreq": "weekly", "priority": "0.8"},
        "contact.html": {"changefreq": "monthly", "priority": "0.6"},
        "privacy.html": {"changefreq": "monthly", "priority": "0.5"},
        "terms.html": {"changefreq": "monthly", "priority": "0.5"},
        "404.html": {"changefreq": "never", "priority": "0.1"},
        "auth.html": {"changefreq": "weekly", "priority": "0.3"},
        "dashboard.html": {"changefreq": "weekly", "priority": "0.3"},
        "buy-credits.html": {"changefreq": "weekly", "priority": "0.7"},
        "success.html": {"changefreq": "never", "priority": "0.2"},
        "usage-based-pricing.html": {"changefreq": "monthly", "priority": "0.7"},
        "agency-signup.html": {"changefreq": "weekly", "priority": "0.6"},
        "agency-dashboard.html": {"changefreq": "weekly", "priority": "0.6"},
        "client-details.html": {"changefreq": "weekly", "priority": "0.6"},
        "forgot-password.html": {"changefreq": "never", "priority": "0.2"},
        "reset-password.html": {"changefreq": "never", "priority": "0.2"},
    }

    for page, data in static_pages.items():
        loc = base_url + page
        urls.append(f"""
    <url>
        <loc>{loc}</loc>
        <lastmod>{current_date}</lastmod>
        <changefreq>{data['changefreq']}</changefreq>
        <priority>{data['priority']}</priority>
    </url>""")

    # Blog posts (dynamic, higher changefreq)
    for file_path in glob.glob("blog/*.html"):
        # Normalize path to use forward slashes for URLs
        normalized_path = file_path.replace(os.sep, "/")
        loc = base_url + normalized_path
        urls.append(f"""
    <url>
        <loc>{loc}</loc>
        <lastmod>{current_date}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>""")

    sitemap_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{"".join(urls)}
</urlset>"""

    with open(sitemap_path, "w") as f:
        f.write(sitemap_content)
    
    print(f"Sitemap generated successfully at {sitemap_path}")

if __name__ == "__main__":
    generate_sitemap()
