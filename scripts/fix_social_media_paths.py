
import glob
import os
from bs4 import BeautifulSoup

def fix_social_media_image_paths(filepath):
    """
    Fixes incorrect social media image paths (e.g., ../../../images/twitter-icon.webp)
    to absolute paths from root (e.g., /images/twitter-icon.webp).
    """
    changed = False
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f, 'html.parser')

        social_media_icons = ['twitter-icon.webp', 'facebook-icon.webp', 'linkedin-icon.webp']

        for img_tag in soup.find_all('img', src=True):
            src = img_tag['src']
            for icon in social_media_icons:
                if icon in src and (src.startswith('../../../images/') or src.startswith('../images/')):
                    new_src = f'/images/{icon}'
                    img_tag['src'] = new_src
                    changed = True
                    print(f"  Fixed social media icon path: {src} -> {new_src} in {filepath}")
                    break # Move to next img_tag once fixed

        if changed:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(soup.prettify())
            return True
        return False

    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    # Only process blog post files, as the issue seems confined there
    html_files = glob.glob('blog/*.html', recursive=True)
    updated_files_count = 0

    print(f"Fixing social media image paths in {len(html_files)} blog HTML files...")

    for html_file in html_files:
        if fix_social_media_image_paths(html_file):
            updated_files_count += 1

    print(f"\nFinished. Updated {updated_files_count} files.")

if __name__ == "__main__":
    main()
