import os
import re
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def generate_alt_from_src(src):
    """
    Generates a human-readable alt text from an image src attribute.
    Example: "/images/blog/post123-my-awesome-image.webp" -> "My awesome image"
    """
    if not src:
        return ""

    # Get the filename from the src
    path = urlparse(src).path
    filename = os.path.basename(path)

    # Remove file extension
    filename_without_extension = os.path.splitext(filename)[0]

    # Replace hyphens and underscores with spaces
    alt_text = filename_without_extension.replace('-', ' ').replace('_', ' ')

    # Remove common prefixes like 'postXXX' from blog images
    alt_text = re.sub(r'post\d+', '', alt_text, flags=re.IGNORECASE).strip()

    # Capitalize the first letter of each significant word (optional, but good for readability)
    # Or just capitalize the first letter of the whole phrase
    if alt_text:
        alt_text = alt_text[0].upper() + alt_text[1:]

    return alt_text.strip()

def add_missing_alt_attributes(base_path="."):
    """
    Iterates through HTML files, finds <img> tags with missing or empty alt attributes,
    generates alt text from the src, and updates the HTML file.
    """
    processed_files_count = 0
    updated_images_count = 0

    print("Starting process to add missing alt attributes...")

    for root, _, files in os.walk(base_path):
        for file in files:
            if file.endswith(".html"):
                html_file_path = os.path.join(root, file)
                relative_path = os.path.relpath(html_file_path, base_path)
                
                # Exclude files in node_modules and venv directories
                if "node_modules" in relative_path or "venv" in relative_path or ".gemini" in relative_path:
                    continue

                original_content = ""
                with open(html_file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    original_content = f.read()

                soup = BeautifulSoup(original_content, 'html.parser')
                file_modified = False

                for img_tag in soup.find_all('img'):
                    if not img_tag.has_attr('alt') or not img_tag['alt'].strip():
                        src = img_tag.get('src')
                        if src:
                            generated_alt = generate_alt_from_src(src)
                            if generated_alt:
                                img_tag['alt'] = generated_alt
                                file_modified = True
                                updated_images_count += 1
                                print(f"  - Added alt='{generated_alt}' to <img src='{src}'> in {relative_path}")
                
                if file_modified:
                    with open(html_file_path, 'w', encoding='utf-8') as f:
                        f.write(str(soup))
                    processed_files_count += 1

    if updated_images_count > 0:
        print(f"\nSuccessfully added alt attributes to {updated_images_count} images in {processed_files_count} files.")
    else:
        print("\nNo missing or empty alt attributes found for automatic generation.")

if __name__ == "__main__":
    add_missing_alt_attributes()
