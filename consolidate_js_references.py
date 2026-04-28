
import os
import glob
from bs4 import BeautifulSoup

def consolidate_js_in_html(filepath):
    """
    Consolidates JavaScript references in a single HTML file:
    Removes old individual script tags and adds a single reference to /js/app.js.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        soup = BeautifulSoup(content, 'html.parser')
        
        changed = False

        # List of old script files that should be removed
        old_scripts = [
            'nav.js',
            'analytics.js',
            'scroll-to-top.js',
            'cookie-consent.js',
            'sticky-cta.js',
            'main.js', # Sometimes used for general scripts
            'auth.js',
            'social-share.js',
            'mobile-swipe-nav.js'
        ]

        # Find and remove old script references
        for script_tag in soup.find_all('script', src=True):
            src = script_tag['src']
            # Check for absolute paths from root /js/ or relative paths ../js/
            if any(f"/{s}" in src or f"../{s}" in src for s in old_scripts):
                script_tag.decompose()
                changed = True
                print(f"  Removed old script: {src}")

        # Check if /js/app.js is already present
        app_js_present = False
        for script_tag in soup.find_all('script', src=True):
            if '/js/app.js' in script_tag['src']:
                app_js_present = True
                break
        
        # Add /js/app.js if not already present and if changes were made (or if it's not a blog post that might not need it)
        # For simplicity, let's just add it if any old scripts were removed or if it's not a blog post
        if not app_js_present:
            # Find a good place to insert, e.g., before </body>
            body_tag = soup.body
            if body_tag:
                new_script_tag = soup.new_tag('script', src='/js/app.js', defer=True)
                body_tag.append(new_script_tag)
                changed = True
                print(f"  Added /js/app.js")
            else:
                print(f"  Warning: No <body> tag found in {filepath}, cannot add /js/app.js")


        if changed:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(soup.prettify())
            return True
        return False

    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    html_files = glob.glob('**/*.html', recursive=True)
    updated_files_count = 0
    
    # Exclude files in node_modules
    html_files = [f for f in html_files if "node_modules" not in f]

    print(f"Consolidating JS references in {len(html_files)} HTML files...")

    for html_file in html_files:
        print(f"Processing {html_file}...")
        if consolidate_js_in_html(html_file):
            updated_files_count += 1

    print(f"\nFinished. Updated {updated_files_count} files.")

if __name__ == "__main__":
    main()
