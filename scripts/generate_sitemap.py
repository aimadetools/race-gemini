import os
import glob
from datetime import datetime
from urllib.parse import urljoin # Import urljoin

def generate_sitemap(project_root=".", output_file="sitemap.xml"):
    html_files = glob.glob(os.path.join(project_root, '**/*.html'), recursive=True)
    
    # Exclude files in node_modules and venv
    html_files = [f for f in html_files if "node_modules" not in f and "venv" not in f]

    # Get the current date in YYYY-MM-DD format for <lastmod>
    lastmod_date = datetime.now().strftime("%Y-%m-%d")

    sitemap_content = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
"""

    for filepath in html_files:
        # Convert absolute path to URL path
        # Assuming project_root is the base for the website
        relative_path = os.path.relpath(filepath, project_root).replace(os.sep, '/')
        
        # Construct the full URL. Assuming the base URL for the site is https://www.localleads.pro
        # This might need to be configurable or extracted from a .env file in a more robust solution
        # For now, I'll use a placeholder base URL
        base_url = "https://www.localleads.pro/"
        loc_url = urljoin(base_url, relative_path)

        sitemap_content += f"""  <url>
    <loc>{loc_url}</loc>
    <lastmod>{lastmod_date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
"""

    sitemap_content += "</urlset>"

    with open(os.path.join(project_root, output_file), 'w', encoding='utf-8') as f:
        f.write(sitemap_content)
    
    print(f"Generated sitemap.xml with {len(html_files)} URLs.")

if __name__ == "__main__":
    generate_sitemap()
