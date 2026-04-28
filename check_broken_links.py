import os
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def check_internal_links(base_path="."):
    broken_links = []
    all_html_files = []

    # Collect all HTML files
    for root, _, files in os.walk(base_path):
        for file in files:
            if file.endswith(".html") and "node_modules" not in root: # Exclude node_modules
                all_html_files.append(os.path.abspath(os.path.join(root, file)))

    print(f"Checking {len(all_html_files)} HTML files for broken internal links...")

    for html_file in all_html_files:
        with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        soup = BeautifulSoup(content, 'html.parser')

        # Helper to resolve paths correctly
        def resolve_path(link_href, current_file_path, base_project_path):
            parsed = urlparse(link_href)
            if parsed.netloc or link_href.startswith('//'): # External link or protocol relative
                return None # Not an internal link to check

            if parsed.path.startswith('/'): # Absolute path from site root
                # Resolve from the project's base path
                return os.path.join(base_project_path, parsed.path.lstrip('/'))
            else: # Relative path
                return os.path.abspath(os.path.join(os.path.dirname(current_file_path), parsed.path))


        # Check <a> tags for href
        for a_tag in soup.find_all('a', href=True):
            link = a_tag['href']
            target_path = resolve_path(link, html_file, base_path)
            if target_path:
                # Normalize the path for consistent checks
                target_path = os.path.abspath(target_path) 
                
                if not os.path.exists(target_path):
                    # Special handling for / to index.html
                    if target_path == os.path.abspath(base_path) and not os.path.exists(os.path.join(target_path, 'index.html')):
                        broken_links.append((html_file, link, "Internal file not found (index.html missing in root)"))
                    elif os.path.isdir(target_path):
                        if not os.path.exists(os.path.join(target_path, 'index.html')):
                            broken_links.append((html_file, link, "Internal directory link without index.html"))
                    else:
                        broken_links.append((html_file, link, "Internal file not found"))

        # Check <link> tags for href (CSS, favicons etc.)
        for link_tag in soup.find_all('link', href=True):
            link = link_tag['href']
            target_path = resolve_path(link, html_file, base_path)
            if target_path:
                target_path = os.path.abspath(target_path)
                if not os.path.exists(target_path):
                    broken_links.append((html_file, link, "Internal stylesheet/resource not found"))

        # Check <img> tags for src
        for img_tag in soup.find_all('img', src=True):
            link = img_tag['src']
            target_path = resolve_path(link, html_file, base_path)
            if target_path:
                target_path = os.path.abspath(target_path)
                if not os.path.exists(target_path):
                    broken_links.append((html_file, link, "Internal image not found"))
    
    if broken_links:
        print("\n--- Broken Internal Links Found ---")
        for origin, link, reason in broken_links:
            print(f"File: {origin}\n  Link: {link}\n  Reason: {reason}\n")
    else:
        print("\nNo broken internal links found.")

if __name__ == "__main__":
    check_internal_links()
