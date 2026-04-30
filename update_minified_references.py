import os
import glob
from bs4 import BeautifulSoup

def update_references(file_path):
    """
    Updates CSS and JS references to their minified versions in an HTML file.
    Handles potential file read/write errors.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except IOError as e:
        print(f"Error reading file {file_path}: {e}")
        return

    soup = BeautifulSoup(content, 'html.parser')
    modified = False

    # Update CSS references
    for link_tag in soup.find_all('link', rel='stylesheet'):
        if 'href' in link_tag.attrs and '.css' in link_tag['href'] and '.min.css' not in link_tag['href']:
            original_href = link_tag['href']
            minified_href = original_href.replace('.css', '.min.css')
            link_tag['href'] = minified_href
            modified = True
            print(f"  Updated CSS: {original_href} -> {minified_href}")

    # Update JS references
    for script_tag in soup.find_all('script'):
        if 'src' in script_tag.attrs and '.js' in script_tag['src'] and '.min.js' not in script_tag['src']:
            original_src = script_tag['src']
            # Special handling for js/app.js as it's already minified
            if original_src == 'js/app.js':
                # No change needed if it's already considered minified
                continue
            
            minified_src = original_src.replace('.js', '.min.js')
            script_tag['src'] = minified_src
            modified = True
            print(f"  Updated JS: {original_src} -> {minified_src}")

    if modified:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(str(soup))
            print(f"Modified: {file_path}")
        except IOError as e:
            print(f"Error writing to file {file_path}: {e}")
    else:
        print(f"No changes needed for: {file_path}")

def main():
    """
    Main function to find all HTML files and update CSS/JS references to their minified versions.
    Skips files in specified excluded directories.
    """
    # Exclude directories (as seen in add_lazy_loading.py output and project structure)
    exclude_dirs = ["node_modules", "venv", "venv-responsive-images", "__pycache__", ".git", ".github", ".vercel", "es", "locales", "api", "help-requests", "sample-pages"]

    # Find all HTML files
    html_files = glob.glob("**/*.html", recursive=True)

    for file_path in html_files:
        # Check if the file is in an excluded directory
        if any(exclude_dir in file_path for exclude_dir in exclude_dirs):
            print(f"Skipping excluded file: {file_path}")
            continue
        
        print(f"Processing {file_path}...")
        update_references(file_path)

if __name__ == "__main__":
    main()