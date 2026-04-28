import os
import re
from bs4 import BeautifulSoup
import subprocess
import json

# Define the default quality for generated WEBP images
DEFAULT_WEBP_QUALITY = 80 

def get_image_dimensions(image_path):
    # This function is a placeholder. In a real scenario, you'd read the image
    # and get its actual dimensions. For now, we'll assume a default aspect ratio.
    # The generate_placeholder_image.py creates 1200x630, which is roughly 16:9 (1.904)
    # We will assume a 16:9 aspect ratio for scaling.
    return 1200, 630

def create_responsive_image_elements(img_tag, original_src, alt_text):
    base_filename = os.path.basename(original_src)
    name_without_ext = os.path.splitext(base_filename)[0]
    
    # Define target widths and their corresponding heights (maintaining aspect ratio of 16:9)
    # Original aspect ratio is 1200/630 = 1.9047, close to 16/9 = 1.777. We will use 16:9.
    aspect_ratio = 16 / 9 
    
    # Target widths: 480px, 800px, 1200px
    target_widths = [480, 800, 1200]
    
    sources = []
    
    # Generate new images for different sizes and add source tags
    for width in target_widths:
        height = int(width / aspect_ratio)
        responsive_filename = f"{name_without_ext}-{width}w.webp"
        
        # Call generate_placeholder_image.py to create the new image
        # This assumes generate_placeholder_image.py is in the same directory
        subprocess.run([
            "python3", "generate_placeholder_image.py",
            alt_text, responsive_filename,
            "--width", str(width),
            "--height", str(height),
            "--quality", str(DEFAULT_WEBP_QUALITY),
            "--output-dir", "images/blog"
        ], check=True)
        
        sources.append(f'<source media="(max-width: {width}px)" srcset="../images/blog/{responsive_filename}" type="image/webp">')

    # Original image as fallback and for larger screens
    final_img_src = original_src.replace("../images/blog/", "") # For correct path in picture tag
    
    picture_tag_html = f'''<picture>
    {'    '.join(sources)}
    <img src="{original_src}" alt="{alt_text}" class="{img_tag.get('class', '')}" loading="{img_tag.get('loading', 'lazy')}">
</picture>'''

    return picture_tag_html

def process_blog_post(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    soup = BeautifulSoup(content, 'html.parser')
    
    # Find all img tags that are not social share icons and don't have srcset already
    img_tags_to_process = []
    for img_tag in soup.find_all('img'):
        src = img_tag.get('src', '')
        
        # Check conditions separately for better readability and to avoid syntax errors
        is_blog_image = src.startswith('../images/blog/')
        is_placeholder_image = src.startswith('https://via.placeholder.com/') or src.startswith('https://placehold.co/')
        has_srcset = img_tag.has_attr('srcset')
        is_social_icon = 'icons8.com' in src

        if (is_blog_image or is_placeholder_image) and not has_srcset and not is_social_icon:
            img_tags_to_process.append(img_tag)

    if not img_tags_to_process:
        print(f"No suitable <img> tags found in {file_path} for responsive conversion.")
        return

    for img_tag in img_tags_to_process:
        original_src = img_tag.get('src')
        alt_text = img_tag.get('alt', 'Image')

        # If it's a placeholder image, we can parse its dimensions from the URL
        if 'via.placeholder.com' in original_src or 'placehold.co' in original_src:
            match = re.search(r'(\d+)x(\d+)', original_src)
            if match:
                width = int(match.group(1))
                height = int(match.group(2))
                aspect_ratio = width / height
            else:
                width, height = get_image_dimensions(original_src) # Fallback
                aspect_ratio = width / height
            
            # Placeholder images don't need new files generated, just srcset
            # For simplicity, we will create a srcset for the placeholder images as well
            # using the existing placeholder service.
            
            # Define target widths
            target_widths = [480, 800, 1200]
            if width not in target_widths:
                target_widths.append(width)
            target_widths.sort()

            sources = []
            srcset_values = []
            for w in target_widths:
                h = int(w / aspect_ratio)
                # Reconstruct placeholder URL with new dimensions
                if 'via.placeholder.com' in original_src:
                    new_src = re.sub(r'(\d+)x(\d+)', f'{w}x{h}', original_src)
                elif 'placehold.co' in original_src:
                    new_src = re.sub(r'(\d+)x(\d+)', f'{w}x{h}', original_src)
                
                sources.append(f'<source media="(max-width: {w}px)" srcset="{new_src}" type="image/webp">')
                srcset_values.append(f'{new_src} {w}w')
            
            # The final image src should use the original dimensions
            final_img_src = original_src
            
            picture_tag_html = f'''<picture>
    {'    '.join(sources)}
    <img src="{final_img_src}" alt="{alt_text}" class="{img_tag.get('class', '')}" loading="{img_tag.get('loading', 'lazy')}" sizes="(max-width: 1200px) 100vw, 1200px">
</picture>'''
        elif original_src.startswith('../images/blog/'):
            # For local webp images, we need to generate new files
            width, height = get_image_dimensions(original_src) # Get assumed dimensions
            aspect_ratio = width / height

            target_widths = [480, 800, 1200]
            sources = []
            
            # Get the base filename without extension
            base_filename_no_ext = os.path.splitext(os.path.basename(original_src))[0]

            for w in target_widths:
                h = int(w / aspect_ratio)
                responsive_filename = f"{base_filename_no_ext}-{w}w.webp"
                
                # Call generate_placeholder_image.py to create the new image
                # This assumes generate_placeholder_image.py is in the same directory
                subprocess.run([
                    "python3", "generate_placeholder_image.py",
                    alt_text, responsive_filename,
                    "--width", str(w),
                    "--height", str(h),
                    "--quality", str(DEFAULT_WEBP_QUALITY),
                    "--output-dir", "images/blog"                ], check=True)
                
                sources.append(f'<source media="(max-width: {w}px)" srcset="../images/blog/{responsive_filename}" type="image/webp">')
            
            picture_tag_html = f'''<picture>
    {'    '.join(sources)}
    <img src="{original_src}" alt="{alt_text}" class="{img_tag.get('class', '')}" loading="{img_tag.get('loading', 'lazy')}" sizes="(max-width: 1200px) 100vw, 1200px">
</picture>'''
        else:
            print(f"Skipping image with src: {original_src} (not a local blog image or known placeholder).")
            continue

        new_img_tag = BeautifulSoup(picture_tag_html, 'html.parser').find('picture')
        img_tag.replace_with(new_img_tag)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"Processed {file_path}")


def main():
    blog_dir = 'blog'
    for filename in os.listdir(blog_dir):
        if filename.endswith('.html'):
            file_path = os.path.join(blog_dir, filename)
            process_blog_post(file_path)

if __name__ == "__main__":
    main()
