import os
import re
import glob
from PIL import Image

# Directories to search for HTML files and images
HTML_DIRS = ["./", "blog/", "api/"] # Added "api/" based on previous listing, though less likely to have images
IMAGE_DIRS = ["images/", "images/blog/"]

def convert_to_webp(image_path):
    """Converts a JPEG image to WebP format."""
    base, ext = os.path.splitext(image_path)
    if ext.lower() in ['.jpg', '.jpeg']:
        webp_path = base + '.webp'
        try:
            with Image.open(image_path) as img:
                img.save(webp_path, 'webp', quality=80) # Adjust quality as needed
            print(f"Converted {image_path} to {webp_path}")
            return webp_path
        except Exception as e:
            print(f"Error converting {image_path} to WebP: {e}")
            return None
    return None

def update_html_file(html_filepath):
    """
    Reads an HTML file, updates <img> tags for WebP, responsive images,
    and lazy loading, then writes the modified HTML back.
    """
    with open(html_filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    img_pattern_double = re.compile(r'(<img[^>]*src=")([^"]+)(")([^>]*>)', re.IGNORECASE | re.DOTALL)
    img_pattern_single = re.compile(r"(<img[^>]*src=')([^']+)(')([^>]*>)", re.IGNORECASE | re.DOTALL)

    modified_content = content
    found_images_in_file = False

    def process_matches(current_content, pattern):
        local_modified_content = current_content
        matches_found_for_pattern = False

        # Use re.finditer on the current_content and reconstruct to avoid issues with replace modifying indices
        # This approach is safer for multiple replacements within the same string
        parts = []
        last_end = 0
        
        for match in pattern.finditer(current_content):
            matches_found_for_pattern = True
            nonlocal found_images_in_file
            found_images_in_file = True

            parts.append(current_content[last_end:match.start()])
            
            full_img_tag = match.group(0)
            before_src = match.group(1)
            src_value = match.group(2)
            quote = match.group(3)
            after_src_suffix = match.group(4) # this is the part after the closing quote and before >

            original_src_absolute = os.path.join(os.path.dirname(html_filepath), src_value)
            original_src_normalized = os.path.normpath(original_src_absolute)

            is_local_image = False
            for img_dir in IMAGE_DIRS:
                # Check if the image path is within one of the defined image directories
                # Using os.path.abspath for consistency
                if os.path.normpath(os.path.abspath(img_dir)).replace('', '/') in os.path.normpath(os.path.abspath(original_src_absolute)).replace('', '/'):
                    is_local_image = True
                    break
            
            new_full_img_tag = full_img_tag # Initialize with original

            if is_local_image and src_value.lower().endswith(('.jpg', '.jpeg')):
                webp_path_relative = src_value.rsplit('.', 1)[0] + '.webp'
                original_image_path = os.path.join(os.path.dirname(html_filepath), src_value)

                # Convert image if it hasn't been already
                # Construct absolute path for webp to check existence reliably
                absolute_webp_path = os.path.join(os.path.dirname(original_image_path), os.path.basename(webp_path_relative))

                if not os.path.exists(absolute_webp_path):
                    converted_webp_path = convert_to_webp(original_image_path)
                    if not converted_webp_path:
                        # If conversion failed, keep original tag
                        parts.append(full_img_tag)
                        last_end = match.end()
                        continue

                # Add loading="lazy" if not present
                new_after_src_suffix = after_src_suffix
                if 'loading="lazy"' not in new_after_src_suffix and "loading='lazy'" not in new_after_src_suffix:
                    new_after_src_suffix = new_after_src_suffix.replace('>', ' loading="lazy">')
                
                # Add basic srcset/sizes if not present
                if 'srcset' not in full_img_tag:
                    # Decide which src to use for srcset: webp_path_relative if converted, else original src_value
                    srcset_src = webp_path_relative if converted else src_value
                    new_after_src_suffix = new_after_src_suffix.replace('>', f' srcset="{srcset_src} 1200w" sizes=" (max-width: 768px) 100vw, 1200px">')

                if converted:
                    # Create the <picture> element structure
                    new_img_tag_str = f"""<picture>
    <source srcset="{webp_path_relative}" type="image/webp">
    {before_src}{src_value}{quote}{new_after_src_suffix}
</picture>"""
                    parts.append(new_img_tag_str)
                else:
                    # If not converted (e.g., empty JPG), just update the <img> tag
                    updated_full_img_tag = f"{before_src}{src_value}{quote}{new_after_src_suffix}"
                    parts.append(updated_full_img_tag)

            elif is_local_image: # Already webp or other format (png, gif)
                # Ensure lazy loading and srcset (if webp/png) if missing
                new_after_src_suffix = after_src_suffix
                tag_modified = False

                if 'loading="lazy"' not in new_after_src_suffix and "loading='lazy'" not in new_after_src_suffix:
                    new_after_src_suffix = new_after_src_suffix.replace('>', ' loading="lazy">')
                    tag_modified = True
                
                if (src_value.lower().endswith('.webp') or src_value.lower().endswith('.png')) and 'srcset' not in full_img_tag:
                    # Generic srcset for existing webp/png
                    new_after_src_suffix = new_after_src_suffix.replace('>', f' srcset="{src_value} 1200w" sizes=" (max-width: 768px) 100vw, 1200px">')
                    tag_modified = True
                
                if tag_modified:
                    new_full_img_tag = f"{before_src}{src_value}{quote}{new_after_src_suffix}"
                    parts.append(new_full_img_tag)
                else:
                    parts.append(full_img_tag) # No changes
            else:
                parts.append(full_img_tag) # Not a local image or not eligible for conversion/modification
            
            last_end = match.end()
        
        parts.append(current_content[last_end:])
        return "".join(parts), matches_found_for_pattern

    # Process double-quoted src attributes
    modified_content, double_matches_found = process_matches(modified_content, img_pattern_double)
    # Process single-quoted src attributes
    modified_content, single_matches_found = process_matches(modified_content, img_pattern_single)
    
    # Check if any images were found or content was modified
    if modified_content != content:
        with open(html_filepath, 'w', encoding='utf-8') as f:
            f.write(modified_content)
        print(f"Updated HTML file: {html_filepath}")
    elif found_images_in_file:
        print(f"No significant changes needed for images in: {html_filepath} (or non-JPEG local images only received lazy loading if missing)")
    else:
        print(f"No local images found or processed in: {html_filepath}")


def main():
    print("Starting image optimization and HTML update script...")

    # Ensure output directories exist for images (if they don't already)
    for img_dir in IMAGE_DIRS:
        os.makedirs(img_dir, exist_ok=True)

    html_files = []
    for h_dir in HTML_DIRS:
        html_files.extend(glob.glob(os.path.join(h_dir, "*.html")))
        html_files.extend(glob.glob(os.path.join(h_dir, "**/*.html"), recursive=True))
    
    html_files = sorted(list(set(html_files))) # Remove duplicates and sort

    print(f"Found {len(html_files)} HTML files to process.")

    for html_file in html_files:
        update_html_file(html_file)
    
    print("Image optimization and HTML update script finished.")

if __name__ == "__main__":
    main()
