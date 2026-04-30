import os
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def fix_blog_image_paths(base_path="."):
    blog_dir = os.path.join(base_path, "blog")
    blog_image_dir_prefix = "/images/blog/" # This is the desired absolute prefix for all blog images
    
    if not os.path.isdir(blog_dir):
        print(f"Blog directory not found: {blog_dir}")
        return

    print(f"Fixing image paths in HTML files under: {blog_dir}")

    for root, _, files in os.walk(blog_dir):
        for file in files:
            if file.endswith(".html"):
                html_file_path = os.path.join(root, file)
                
                with open(html_file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                soup = BeautifulSoup(content, 'html.parser')
                modified = False

                for img_tag in soup.find_all('img', src=True):
                    original_src = img_tag['src']
                    
                    # Only target images that are likely blog post images (contains "post" and ".webp")
                    if "post" in original_src and ".webp" in original_src:
                        # Extract just the filename (e.g., "post123.webp")
                        # This handles cases like ../images/post123.webp, /images/post123.webp, /images/blog/post123.webp
                        image_filename = os.path.basename(urlparse(original_src).path)
                        
                        # Construct the correct absolute path
                        correct_src = blog_image_dir_prefix + image_filename

                        if original_src != correct_src:
                            img_tag['src'] = correct_src
                            modified = True
                            # print(f"  Modified: {original_src} -> {correct_src} in {html_file_path}")

                if modified:
                    with open(html_file_path, 'w', encoding='utf-8') as f:
                        f.write(str(soup))
                    print(f"Updated: {html_file_path}")

    print("Image path fixing complete.")

if __name__ == "__main__":
    fix_blog_image_paths()
