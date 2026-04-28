
import os
import glob
from bs4 import BeautifulSoup
from urllib.parse import urlparse, unquote

def is_local_path(url):
    """Checks if a URL is a local file path."""
    parsed = urlparse(url)
    # Consider paths without a scheme or with a 'file' scheme as local
    # Also include paths starting with '/' or relative paths
    return not parsed.scheme or parsed.scheme == 'file' or (not parsed.netloc and not url.startswith('http') and not url.startswith('//'))

def check_html_file(filepath):
    """Checks a single HTML file for broken internal links/assets."""
    broken_links = []
    base_dir = os.path.dirname(filepath)

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f, 'html.parser')

        # Check <a> tags for hrefs
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            # Decode URL-encoded characters
            href_decoded = unquote(href)
            if is_local_path(href_decoded) and not href_decoded.startswith('#') and not href_decoded.startswith('javascript:'):
                # Handle relative paths, ensuring they are relative to the project root
                if href_decoded.startswith('/'):
                    # Absolute path from project root
                    target_path = os.path.join(os.getcwd(), href_decoded[1:])
                else:
                    # Relative path from the current file's directory
                    target_path = os.path.join(base_dir, href_decoded)

                # Normalize the path to remove '..' and '.'
                target_path = os.path.normpath(target_path)

                # Strip query parameters and anchors for file existence check
                target_path_no_query = target_path.split('?')[0].split('#')[0]

                if not os.path.exists(target_path_no_query) and not os.path.isdir(target_path_no_query):
                    # Check if it's a directory, and if so, check for index.html inside
                    if os.path.isdir(target_path_no_query):
                        if not os.path.exists(os.path.join(target_path_no_query, 'index.html')):
                             broken_links.append(f"Broken link (a href): {href} -> {target_path_no_query} (from {filepath})")
                    else:
                        broken_links.append(f"Broken link (a href): {href} -> {target_path_no_query} (from {filepath})")

        # Check <img> tags for src
        for img_tag in soup.find_all('img', src=True):
            src = img_tag['src']
            # Decode URL-encoded characters
            src_decoded = unquote(src)
            if is_local_path(src_decoded):
                if src_decoded.startswith('/'):
                    target_path = os.path.join(os.getcwd(), src_decoded[1:])
                else:
                    target_path = os.path.join(base_dir, src_decoded)

                target_path = os.path.normpath(target_path)
                target_path_no_query = target_path.split('?')[0].split('#')[0]

                if not os.path.exists(target_path_no_query):
                    broken_links.append(f"Broken image (img src): {src} -> {target_path_no_query} (from {filepath})")

        # Check <link> tags for href (e.g., stylesheets, favicons)
        for link_tag in soup.find_all('link', href=True):
            href = link_tag['href']
            href_decoded = unquote(href)
            if is_local_path(href_decoded) and not href_decoded.startswith('#'):
                if href_decoded.startswith('/'):
                    target_path = os.path.join(os.getcwd(), href_decoded[1:])
                else:
                    target_path = os.path.join(base_dir, href_decoded)

                target_path = os.path.normpath(target_path)
                target_path_no_query = target_path.split('?')[0].split('#')[0]

                if not os.path.exists(target_path_no_query):
                    broken_links.append(f"Broken link (link href): {href} -> {target_path_no_query} (from {filepath})")

        # Check <script> tags for src
        for script_tag in soup.find_all('script', src=True):
            src = script_tag['src']
            src_decoded = unquote(src)
            if is_local_path(src_decoded):
                if src_decoded.startswith('/'):
                    target_path = os.path.join(os.getcwd(), src_decoded[1:])
                else:
                    target_path = os.path.join(base_dir, src_decoded)

                target_path = os.path.normpath(target_path)
                target_path_no_query = target_path.split('?')[0].split('#')[0]

                if not os.path.exists(target_path_no_query):
                    broken_links.append(f"Broken script (script src): {src} -> {target_path_no_query} (from {filepath})")


    except Exception as e:
        broken_links.append(f"Error processing {filepath}: {e}")

    return broken_links

def main():
    html_files = glob.glob('**/*.html', recursive=True)
    # Exclude files in node_modules
    html_files = [f for f in html_files if "node_modules" not in f]
    all_broken_links = {}

    print(f"Checking {len(html_files)} HTML files for broken internal links...")

    for html_file in html_files:
        broken = check_html_file(html_file)
        if broken:
            all_broken_links[html_file] = broken

    if all_broken_links:
        print("\n--- BROKEN LINKS FOUND ---")
        for file, links in all_broken_links.items():
            print(f"\nIn file: {file}")
            for link in links:
                print(f"  - {link}")
        print("\n--- END OF BROKEN LINKS ---")
    else:
        print("\nNo broken internal links or assets found.")

if __name__ == "__main__":
    main()
