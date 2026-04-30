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

                # Check <img> tags for src
                for img_tag in soup.find_all('img', src=True):
                    original_src = img_tag['src']
                    
                    # Clean up malformed attributes if present
                    if 'class' in img_tag.attrs and isinstance(img_tag['class'], list):
                        img_tag['class'] = [c for c in img_tag['class'] if c not in ['generated-placeholder', '']]
                        if not img_tag['class']:
                            del img_tag['class']
                    
                    if "post" in original_src or "banner" in original_src: # Broaden to catch banner images
                        image_filename = os.path.basename(urlparse(original_src).path)
                        correct_src = blog_image_dir_prefix + image_filename

                        if original_src != correct_src:
                            img_tag['src'] = correct_src
                            modified = True

                # Check <source> tags for srcset within <picture>
                for source_tag in soup.find_all('source', srcset=True):
                    original_srcset = source_tag['srcset']
                    # Split srcset by comma to handle multiple URLs and then clean up each
                    srcset_parts = [part.strip().split(' ')[0] for part in original_srcset.split(',')] # Get only the URL part
                    
                    new_srcset_parts = []
                    srcset_modified = False

                    for src_url in srcset_parts:
                        if "post" in src_url or "banner" in src_url:
                            image_filename = os.path.basename(urlparse(src_url).path)
                            correct_src_url = blog_image_dir_prefix + image_filename
                            if src_url != correct_src_url:
                                new_srcset_parts.append(correct_src_url)
                                srcset_modified = True
                            else:
                                new_srcset_parts.append(src_url)
                        else:
                            new_srcset_parts.append(src_url)

                    if srcset_modified:
                        # Reconstruct srcset with original descriptors (e.g., "480w")
                        # This part needs to be smarter. For now, assume a simple replacement.
                        # A full solution would parse "480w" etc.
                        # For simplicity, if the script only outputs one URL, we assume the format is just the URL.
                        # If there are multiple, we need to reconstruct the entire string.
                        # Given the input, it seems to be in the format "url width", so we need to retain width.

                        # A more robust approach for srcset:
                        reconstructed_srcset = []
                        original_parts_with_descriptors = [part.strip() for part in original_srcset.split(',')]

                        for i, part_with_descriptor in enumerate(original_parts_with_descriptors):
                            url_only = part_with_descriptor.split(' ')[0]
                            descriptor = ' '.join(part_with_descriptor.split(' ')[1:])

                            if "post" in url_only or "banner" in url_only:
                                image_filename = os.path.basename(urlparse(url_only).path)
                                correct_src_url = blog_image_dir_prefix + image_filename
                                if url_only != correct_src_url:
                                    reconstructed_srcset.append(f"{correct_src_url} {descriptor}".strip())
                                    modified = True
                                else:
                                    reconstructed_srcset.append(part_with_descriptor)
                            else:
                                reconstructed_srcset.append(part_with_descriptor)

                        source_tag['srcset'] = ', '.join(reconstructed_srcset)

                if modified:
                    with open(html_file_path, 'w', encoding='utf-8') as f:
                        f.write(str(soup))
                    print(f"Updated: {html_file_path}")

    print("Image path fixing complete.")

if __name__ == "__main__":
    fix_blog_image_paths()
