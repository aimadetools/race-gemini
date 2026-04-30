import os
import glob
from bs4 import BeautifulSoup

def add_lazy_loading_to_images(file_path):
    """
    Adds loading="lazy" attribute to <img> tags that don't have it.
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
    for img_tag in soup.find_all('img'):
        if 'loading' not in img_tag.attrs or img_tag['loading'] != 'lazy':
            img_tag['loading'] = 'lazy'
            modified = True

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
    Main function to find all HTML files and apply lazy loading to images.
    Skips files in specified excluded directories.
    """
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
