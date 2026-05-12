import os
import re
from bs4 import BeautifulSoup
from PIL import Image # Import Image to get actual dimensions

def get_image_dimensions_from_file(image_path):
    """Attempts to get image dimensions from a file."""
    try:
        with Image.open(image_path) as img:
            return img.size
    except Exception:
        return None, None

def process_html_file_for_responsive_images(file_path):
    """
    Processes a single HTML file to replace <img> tags with <picture> elements
    for responsive images, using WebP versions if available.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except IOError as e:
        print(f"Error reading file {file_path}: {e}")
        return

    soup = BeautifulSoup(content, 'html.parser')
    modified = False
    
    img_tags_to_process = []
    for img_tag in soup.find_all('img'):
        src = img_tag.get('src', '')
        # Skip if already inside a <picture> tag
        if img_tag.find_parent('picture'):
            continue
        # Skip if it's a social icon (typically small and not content images)
        if 'icons8.com' in src:
            continue
        # Only process images from images/blog or images/ (relative paths)
        if src.startswith('../images/') or src.startswith('/images/'):
            img_tags_to_process.append(img_tag)

    if not img_tags_to_process:
        print(f"No suitable <img> tags found in {file_path} for responsive conversion.")
        return

    for img_tag in img_tags_to_process:
        original_src = img_tag.get('src')
        alt_text = img_tag.get('alt', '')
        classes = img_tag.get('class', [])
        loading_attr = img_tag.get('loading', 'lazy')
        width_attr = img_tag.get('width')
        height_attr = img_tag.get('height')

        # Clean up path for lookup
        cleaned_src = original_src.replace('../', '')
        base_src_dir = os.path.dirname(cleaned_src)
        base_name_no_ext = os.path.splitext(os.path.basename(cleaned_src))[0]

        # Get actual dimensions for fallback img and aspect ratio
        image_full_path_for_dims = os.path.join(os.getcwd(), cleaned_src.lstrip('/'))
        original_width, original_height = get_image_dimensions_from_file(image_full_path_for_dims)
        
        if original_width is None or original_height is None:
            # Fallback if dimensions cannot be determined from file
            # Attempt to use width/height attributes from the img tag
            try:
                original_width = int(width_attr) if width_attr else 1200
                original_height = int(height_attr) if height_attr else 630
            except (ValueError, TypeError):
                original_width, original_height = 1200, 630 # Default if attrs are bad
            print(f"Warning: Could not get dimensions from file for {original_src}. Used attributes or default: {original_width}x{original_height}.")

        aspect_ratio = original_width / original_height if original_height else 16/9 # Prevent division by zero

        target_widths = [480, 800, 1200]
        webp_sources = []
        img_srcset_values = []
        
        # Populate webp_sources and img_srcset_values
        for width in target_widths:
            # Generate expected WebP path
            webp_filename = f"{base_name_no_ext}-{width}w.webp"
            webp_path = os.path.join(base_src_dir, webp_filename)

            # Check if the WebP file actually exists on disk (relative to CWD)
            abs_webp_path = os.path.join(os.getcwd(), webp_path)
            if os.path.exists(abs_webp_path):
                webp_sources.append(f'{original_src.replace(os.path.basename(original_src), webp_filename)} {width}w')
                img_srcset_values.append(f'{original_src.replace(os.path.basename(original_src), webp_filename)} {width}w')

        # Construct the <picture> element
        picture_tag = soup.new_tag('picture')

        # Add <source> tags for WebP versions
        if webp_sources:
            source_tag = soup.new_tag('source', srcset=", ".join(webp_sources), type="image/webp", sizes="(max-width: 1200px) 100vw, 1200px")
            picture_tag.append(source_tag)

        # Add the original <img> tag as a fallback
        # Update its src to the original, but ensure srcset and sizes are present for original format if available.
        # If original_src points to a .webp, then the direct img src can be that.
        final_img_tag = soup.new_tag('img')
        final_img_tag['src'] = original_src # Original image as fallback
        final_img_tag['alt'] = alt_text
        if classes:
            final_img_tag['class'] = " ".join(classes)
        final_img_tag['loading'] = loading_attr
        if original_width:
            final_img_tag['width'] = original_width
        if original_height:
            final_img_tag['height'] = original_height
        
        # Add srcset and sizes to the <img> tag as well for non-WebP browsers
        if img_srcset_values:
            final_img_tag['srcset'] = ", ".join(img_srcset_values)
            final_img_tag['sizes'] = "(max-width: 1200px) 100vw, 1200px"

        picture_tag.append(final_img_tag)

        img_tag.replace_with(picture_tag)
        modified = True
        print(f"  Replaced <img> with <picture> for {original_src}")

    if modified:
        try:
            # Use prettify to keep the HTML readable
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(str(soup.prettify()))
            print(f"Modified HTML: {file_path}")
        except IOError as e:
            print(f"Error writing to file {file_path}: {e}")
    else:
        print(f"No changes needed for: {file_path}")

def main():
    """
    Main function to find all HTML files and apply responsive image changes.
    """
    exclude_dirs = ["node_modules", "venv", "venv-responsive-images", "__pycache__", ".git", ".github", ".vercel", "es", "locales", "api", "help-requests", "sample-pages"]

    html_files = []
    # Find all HTML files
    for root, _, files in os.walk('.'):
        for file in files:
            if file.endswith('.html'):
                full_path = os.path.join(root, file)
                if not any(exclude_dir in full_path for exclude_dir in exclude_dirs):
                    html_files.append(full_path)

    for file_path in html_files:
        print(f"Processing {file_path}...")
        process_html_file_for_responsive_images(file_path)

if __name__ == "__main__":
    main()
