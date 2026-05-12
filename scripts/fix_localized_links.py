
import glob
import os
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin

def fix_localized_links_in_html(filepath):
    """
    Fixes links in localized HTML files (e.g., es/*.html) that incorrectly
    point to untranslated pages within the same directory.
    Changes them to point to the English versions at the root.
    """
    changed = False
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        soup = BeautifulSoup(content, 'html.parser')

        # List of pages that are currently only in English at the root
        english_only_pages = [
            'blog.html',
            'privacy.html',
            'terms.html',
            'agency-signup.html',
            'buy-credits.html'
        ]

        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            parsed_href = urlparse(href)
            
            # Check if the href is a local path and matches one of the English-only pages
            # and it's not already an absolute path from root
            if (not parsed_href.scheme and not parsed_href.netloc and 
               os.path.basename(href) in english_only_pages and 
               not href.startswith('/')):
                
                new_href = f'/{os.path.basename(href)}'
                a_tag['href'] = new_href
                changed = True
                print(f"  Fixed link: {href} -> {new_href} in {filepath}")

        if changed:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(soup.prettify())
            return True
        return False

    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    html_files = glob.glob('es/*.html', recursive=False) # Only top-level es HTML files
    updated_files_count = 0

    print(f"Fixing localized links in {len(html_files)} Spanish HTML files...")

    for html_file in html_files:
        if fix_localized_links_in_html(html_file):
            updated_files_count += 1

    print(f"\nFinished. Updated {updated_files_count} files.")

if __name__ == "__main__":
    main()
