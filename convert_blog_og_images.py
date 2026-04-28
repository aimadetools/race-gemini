import os
import re
from bs4 import BeautifulSoup
import subprocess
import argparse

def convert_blog_og_images(quality=80):
    blog_dir = 'blog'
    images_dir = 'images'
    og_webp_dir = os.path.join(images_dir, 'og_webp')
    os.makedirs(og_webp_dir, exist_ok=True)

    for filename in os.listdir(blog_dir):
        if filename.endswith('.html'):
            file_path = os.path.join(blog_dir, filename)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            soup = BeautifulSoup(content, 'html.parser')
            
            blog_post_title = soup.title.string if soup.title else "Untitled Blog Post"
            
            modified = False
            for meta_tag in soup.find_all('meta', attrs={'property': ['og:image', 'twitter:image']}):
                original_url = meta_tag.get('content')
                if not original_url:
                    continue
                
                # Extract image base name to use for the new WEBP filename
                # Handles both absolute URLs and relative paths if any were present (though current grep shows absolute)
                image_base_name_match = re.search(r'/([^/]+\.(?:jpg|png|webp))$', original_url)
                if image_base_name_match:
                    original_image_filename = image_base_name_match.group(1)
                    name_without_ext = os.path.splitext(original_image_filename)[0]
                    webp_filename = f"{name_without_ext}.webp"
                    target_webp_path_full = os.path.join(os.getcwd(), og_webp_dir, webp_filename)

                    # Call generate_placeholder_image.py to create the new image
                    # This ensures a valid WEBP image is created, replacing potentially broken JPG/PNG placeholders
                    subprocess.run([
                        "python3", "generate_placeholder_image.py",
                        blog_post_title, webp_filename, # Pass title and target filename
                        "--width", "1200", # Standard OG image width
                        "--height", "630", # Standard OG image height
                        "--quality", str(quality),
                        "--output-dir", og_webp_dir
                    ], check=True)
                    print(f"Generated new OG image: {target_webp_path_full}")
                    
                    # Update the URL in the meta tag
                    # Assuming the base URL for images is consistent
                    new_url = f"https://www.localleads.com/images/og_webp/{webp_filename}"
                    if meta_tag['content'] != new_url:
                        meta_tag['content'] = new_url
                        modified = True
                else:
                    print(f"Could not parse image filename from URL: {original_url} in {file_path}")
            
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(str(soup))
                print(f"Updated {file_path} with WEBP image references.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert blog Open Graph/Twitter images from JPG/PNG to WEBP and update HTML references.")
    parser.add_argument("--quality", type=int, default=80, help="The quality of the WEBP image (1-100). Default is 80.")
    args = parser.parse_args()
    
    convert_blog_og_images(quality=args.quality)
