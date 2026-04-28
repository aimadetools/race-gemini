import os
import glob
from bs4 import BeautifulSoup

def add_lazy_loading_to_images(file_path):
    """
    Adds loading="lazy" attribute to <img> tags that don't have it.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    soup = BeautifulSoup(content, 'html.parser')
    
    modified = False
    for img_tag in soup.find_all('img'):
        if 'loading' not in img_tag.attrs:
            img_tag['loading'] = 'lazy'
            modified = True
        elif img_tag['loading'] != 'lazy':
            # If loading attribute exists but is not 'lazy', consider changing it.
            # For now, we'll assume we want all non-eager images to be lazy.
            img_tag['loading'] = 'lazy'
            modified = True

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
        print(f"Modified: {file_path}")
    else:
        print(f"No changes needed for: {file_path}")

def main():
    # Exclude directories
    exclude_dirs = ["node_modules", "venv", "venv-responsive-images", "__pycache__", ".git", ".github", ".vercel", "es", "locales", "api", "help-requests"]

    # Find all HTML files
    html_files = glob.glob("**/*.html", recursive=True)

    for file_path in html_files:
        # Check if the file is in an excluded directory
        if any(exclude_dir in file_path for exclude_dir in exclude_dirs):
            print(f"Skipping excluded file: {file_path}")
            continue
        
        add_lazy_loading_to_images(file_path)

if __name__ == "__main__":
    main()
