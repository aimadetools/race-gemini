import os
from bs4 import BeautifulSoup
from urllib.parse import unquote

def fix_image_links():
    blog_dir = "blog"
    images_base_dir = "images"
    fixed_count = 0

    # Get the absolute path to the project root
    project_root = os.path.dirname(os.path.abspath(__file__))

    # Iterate through all blog posts
    for root, _, files in os.walk(blog_dir):
        for file in files:
            if file.endswith(".html"):
                file_path = os.path.join(root, file)
                
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                soup = BeautifulSoup(content, 'html.parser')
                modified = False

                # Fix for img tags and source tags within picture
                for tag in soup.find_all(['img', 'source'], src=True):
                    src = tag['src']
                    original_src = src # Keep original for comparison

                    # Decode URL-encoded characters in the src (e.g., spaces)
                    src_decoded = unquote(src)

                    # Determine the absolute path to the *referenced* image
                    if src_decoded.startswith('/'): # Absolute path from site root
                        referenced_abs_path = os.path.join(project_root, src_decoded.lstrip('/'))
                    else: # Relative path
                        referenced_abs_path = os.path.abspath(os.path.join(os.path.dirname(file_path), src_decoded))

                    # Debugging prints
                    # print(f"Checking {file_path}: src={src_decoded}")
                    # print(f"  Referenced absolute path: {referenced_abs_path}, Exists: {os.path.exists(referenced_abs_path)}")

                    # Check if the exact referenced file exists
                    if not os.path.exists(referenced_abs_path):
                        # Try to find a JPG version if WEBP is referenced and not found
                        if src_decoded.lower().endswith('.webp'):
                            jpg_candidate_path = os.path.splitext(referenced_abs_path)[0] + '.jpg'
                            # print(f"  JPG candidate path: {jpg_candidate_path}, Exists: {os.path.exists(jpg_candidate_path)}")
                            if os.path.exists(jpg_candidate_path):
                                # Construct the new relative path
                                new_src = os.path.splitext(src_decoded)[0] + '.jpg'
                                tag['src'] = new_src
                                modified = True
                                fixed_count += 1
                                print(f"Fixed WEBP to JPG: {original_src} -> {new_src} in {file_path}")
                        # Try to find a WEBP version if JPG is referenced and not found
                        elif src_decoded.lower().endswith('.jpg'):
                            webp_candidate_path = os.path.splitext(referenced_abs_path)[0] + '.webp'
                            # print(f"  WEBP candidate path: {webp_candidate_path}, Exists: {os.path.exists(webp_candidate_path)}")
                            if os.path.exists(webp_candidate_path):
                                # Construct the new relative path
                                new_src = os.path.splitext(src_decoded)[0] + '.webp'
                                tag['src'] = new_src
                                modified = True
                                fixed_count += 1
                                print(f"Fixed JPG to WEBP: {original_src} -> {new_src} in {file_path}")
                
                if modified:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(str(soup))

    print(f"Completed image link fixing. Total {fixed_count} links fixed.")

if __name__ == "__main__":
    fix_image_links()
