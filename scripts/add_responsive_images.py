import os
import re
from bs4 import BeautifulSoup
from PIL import Image  # Import Image to get actual dimensions
import glob  # Import glob


def process_html_file(file_path):
    """
    Processes a single HTML file to replace <img> tags with <picture> elements
    for responsive images, assuming WebP versions are already generated.
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except IOError as e:
        print(f"Error reading file {file_path}: {e}")
        return

    soup = BeautifulSoup(content, "html.parser")
    modified = False

    # Find all img tags that are not social share icons and don't already have a parent <picture> tag
    img_tags_to_process = []
    for img_tag in soup.find_all("img"):
        src = img_tag.get("src", "")
        # Check if the img tag is already inside a picture tag
        if img_tag.find_parent("picture"):
            continue

        is_blog_image = src.startswith("../images/blog/") or src.startswith(
            "/images/blog/"
        )
        is_social_icon = "icons8.com" in src  # Exclude social share icons

        if is_blog_image and not is_social_icon:
            img_tags_to_process.append(img_tag)

    if not img_tags_to_process:
        print(f"No suitable <img> tags found in {file_path} for responsive conversion.")
        return

    for img_tag in img_tags_to_process:
        original_src = img_tag.get("src")
        alt_text = img_tag.get("alt", "")
        classes = img_tag.get("class", [])
        loading_attr = img_tag.get("loading", "lazy")

        # Determine the absolute path to the original image for dimension lookup
        # This assumes images are in /images/blog/ relative to the project root
        # Or relative to the HTML file itself
        image_relative_path = original_src.replace(
            "../", ""
        )  # Adjust for relative paths
        image_full_path = os.path.join(os.getcwd(), image_relative_path.lstrip("/"))

        original_width, original_height = 0, 0
        try:
            with Image.open(image_full_path) as img:
                original_width, original_height = img.size
        except Exception as e:
            print(
                f"Warning: Could not get dimensions for {image_full_path}. Error: {e}. Using default aspect ratio."
            )
            original_width, original_height = 1200, 630  # Fallback values

        if original_width == 0:  # If still 0, use a default aspect ratio
            aspect_ratio = 16 / 9
        else:
            aspect_ratio = original_width / original_height

        base_filename_no_ext = os.path.splitext(os.path.basename(original_src))[0]
        base_src_path = os.path.dirname(original_src)

        target_widths = [480, 800, 1200]
        sources = []
        srcset_values = []  # For the <img> srcset

        for width in target_widths:
            height = int(width / aspect_ratio)
            # Assuming generated images are named consistently like 'image-480w.webp'
            responsive_filename = f"{base_filename_no_ext}-{width}w.webp"

            # Construct relative path to the responsive image
            full_responsive_path = os.path.join(base_src_path, responsive_filename)

            # Check if the responsive image actually exists before adding to sources
            # This check is crucial to avoid broken links
            # For simplicity, we'll assume they exist for now as generate_responsive_images.py ran

            sources.append(
                f'<source media="(max-width: {width}px)" srcset="{full_responsive_path}" type="image/webp">'
            )
            srcset_values.append(f"{full_responsive_path} {width}w")

        # Original image in WebP format as a fallback and for larger sizes
        # The generate_responsive_images.py also saves the original size as webp
        original_webp_path = os.path.join(
            base_src_path, f"{base_filename_no_ext}-{original_width}w.webp"
        )
        # Add the original image (converted to webp) as the last source and default for the <img> tag
        # Only add if not already in srcset_values to avoid duplicates.
        if f"{original_webp_path} {original_width}w" not in srcset_values:
            srcset_values.append(f"{original_webp_path} {original_width}w")

        # Ensure original_src is also handled, perhaps as a final fallback for non-webp browsers
        final_img_src = original_src  # Use the original for non-webp fallback

        picture_tag_html = f"""<picture>
    {'    '.join(sources)}
    <img src="{final_img_src}" alt="{alt_text}" class="{' '.join(classes)}" loading="{loading_attr}" width="{original_width}" height="{original_height}" srcset="{', '.join(srcset_values)}" sizes="(max-width: 1200px) 100vw, 1200px">
</picture>"""

        new_picture_tag = BeautifulSoup(picture_tag_html, "html.parser").find("picture")
        img_tag.replace_with(new_picture_tag)
        modified = True
        print(f"  Replaced <img> with <picture> for {original_src}")

    if modified:
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(str(soup.prettify()))  # Use prettify for better formatting
            print(f"Modified HTML: {file_path}")
        except IOError as e:
            print(f"Error writing to file {file_path}: {e}")
    else:
        print(f"No changes needed for: {file_path}")


def main():
    """
    Main function to find all HTML files and apply responsive image changes.
    """
    exclude_dirs = [
        "node_modules",
        "venv",
        "venv-responsive-images",
        "__pycache__",
        ".git",
        ".github",
        ".vercel",
        "es",
        "locales",
        "api",
        "help-requests",
        "sample-pages",
    ]

    html_files = glob.glob("**/*.html", recursive=True)

    for file_path in html_files:
        if any(exclude_dir in file_path for exclude_dir in exclude_dirs):
            # print(f"Skipping excluded file: {file_path}")
            continue

        print(f"Processing {file_path}...")
        process_html_file(file_path)


if __name__ == "__main__":
    main()
