import os
import re
from generate_placeholder_image import generate_placeholder_image

def rebuild_blog_images():
    blog_dir = "blog"
    images_dir = os.path.join("images", "blog")
    
    # Ensure the images/blog directory exists
    os.makedirs(images_dir, exist_ok=True)

    for filepath in os.listdir(blog_dir):
        if filepath.startswith("post") and filepath.endswith(".html"):
            html_path = os.path.join(blog_dir, filepath)
            
            with open(html_path, 'r', encoding='utf-8') as f:
                content = f.read()

            title_match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
            title = title_match.group(1).strip() if title_match else "No Title Provided"
            
            modified_content = content
            jpg_found_and_deleted = False

            # Regex to find image paths in og:image, twitter:image, and img src
            # Group 1: The full tag (e.g., <meta property="og:image" content="..." />)
            # Group 2: The URL inside content="...jpg" or src="...jpg"
            image_patterns = [
                (re.compile(r'(<meta property="og:image" content="(.*?\.jpg)"/)', re.IGNORECASE)),
                (re.compile(r'(<meta property="twitter:image" content="(.*?\.jpg)"/)', re.IGNORECASE)),
                (re.compile(r'(<img[^>]*?src="(.*?\.jpg)"[^>]*?>)', re.IGNORECASE))
            ]

            for pattern in image_patterns:
                for match in pattern.finditer(modified_content):
                    full_tag = match.group(1)
                    image_url = match.group(2)
                    
                    # Ensure it's a local .jpg image and not a via.placeholder.com URL
                    if "via.placeholder.com" not in image_url and image_url.lower().endswith(".jpg"):
                        
                        # Extract just the filename for the webp version
                        base_image_name = os.path.basename(image_url)
                        webp_filename = os.path.splitext(base_image_name)[0] + ".webp"
                        
                        # Generate the webp image
                        generate_placeholder_image(title, webp_filename)
                        
                        # Construct the new relative path for the webp image
                        # Assuming image_url is like ../images/blog/postXXX.jpg
                        # or images/blog/postXXX.jpg
                        new_image_url = image_url.replace(".jpg", ".webp")

                        # Replace the old tag with the new one pointing to webp
                        if "<img" in full_tag:
                            # For img tags, also add a comment
                            new_tag = full_tag.replace(image_url, new_image_url).replace('>', ' class="generated-placeholder" loading="lazy" /> <!-- Generated Placeholder Image -->')
                            # Also ensure alt text exists if not present (simple check)
                            if 'alt="' not in new_tag:
                                new_tag = new_tag.replace('src=', f'alt="{title}" src=')
                        else:
                            new_tag = full_tag.replace(image_url, new_image_url)
                        
                        modified_content = modified_content.replace(full_tag, new_tag)
                        
                        # Delete the old .jpg file
                        # Convert image_url to an absolute path relative to the project root
                        # This assumes image_url is relative to the html file, e.g., ../images/blog/
                        # or relative to the root, e.g., /images/blog/
                        
                        # Check for the common relative path from blog posts
                        if image_url.startswith("../images/blog/"):
                            old_jpg_path = os.path.join(os.path.dirname(os.path.dirname(html_path)), image_url)
                        elif image_url.startswith("/images/blog/"):
                             old_jpg_path = os.path.join(os.getcwd(), image_url[1:]) # remove leading /
                        else:
                            old_jpg_path = os.path.join(images_dir, base_image_name) # Assume directly in images/blog

                        if os.path.exists(old_jpg_path) and os.path.getsize(old_jpg_path) == 0:
                            os.remove(old_jpg_path)
                            print(f"Deleted empty JPG: {old_jpg_path}")
                            jpg_found_and_deleted = True
                        elif os.path.exists(old_jpg_path):
                            # If it's not empty, it might be a text placeholder, read and check
                            try:
                                with open(old_jpg_path, 'r', encoding='utf-8') as jpg_f:
                                    first_line = jpg_f.readline().strip()
                                if "placeholder image" in first_line.lower():
                                    os.remove(old_jpg_path)
                                    print(f"Deleted text placeholder JPG: {old_jpg_path}")
                                    jpg_found_and_deleted = True
                            except UnicodeDecodeError:
                                # It's a binary file, but still invalid according to previous checks
                                # We can decide to delete it or keep it if it's not 0-byte and not text
                                # For now, let's assume if it's not 0-byte and not text, it's a real image that should be converted by convert_images.py
                                pass
                                

            if modified_content != content:
                with open(html_path, 'w', encoding='utf-8') as f:
                    f.write(modified_content)
                print(f"Updated HTML for {html_path}")
            
            elif not jpg_found_and_deleted:
                # If no JPGs were found or deleted, but this is a new blog post that might
                # have just been created with a placeholder. We need to check if a WEBP
                # needs to be generated based on the blog post name.
                
                # Derive expected image name from html file name
                base_html_name = os.path.basename(filepath) # e.g., post339.html
                base_name_without_ext = os.path.splitext(base_html_name)[0] # e.g., post339
                
                expected_webp_filename = f"{base_name_without_ext}.webp"
                expected_webp_path = os.path.join(images_dir, expected_webp_filename)

                # Check if the .webp image already exists
                if not os.path.exists(expected_webp_path):
                    # Check if there's a corresponding .jpg file
                    expected_jpg_filename = f"{base_name_without_ext}.jpg"
                    expected_jpg_path = os.path.join(images_dir, expected_jpg_filename)
                    
                    if os.path.exists(expected_jpg_path) and (os.path.getsize(expected_jpg_path) == 0 or "placeholder image" in open(expected_jpg_path, 'r', encoding='utf-8', errors='ignore').readline().strip().lower()):
                        # We have an empty or text-placeholder JPG, let's create a WEBP and update the HTML
                        generate_placeholder_image(title, expected_webp_filename)
                        os.remove(expected_jpg_path)
                        print(f"Generated WEBP from empty JPG and deleted: {expected_jpg_path}")
                        
                        # Now, update the HTML to reference the new WEBP
                        old_img_ref = f'src="../images/blog/{base_name_without_ext}.jpg"'
                        new_img_ref = f'src="../images/blog/{base_name_without_ext}.webp" class="generated-placeholder" loading="lazy" alt="{title}"'
                        if old_img_ref in modified_content:
                            modified_content = modified_content.replace(old_img_ref, new_img_ref)
                            with open(html_path, 'w', encoding='utf-8') as f:
                                f.write(modified_content)
                            print(f"Updated HTML for {html_path} to reference {expected_webp_filename}")
                        # else:
                            # It's possible the HTML didn't have an img src, but only meta tags.
                            # We should probably handle adding meta tags if they don't exist, but that's more complex.
                            # For now, let's assume meta tags will be handled by convert_images.py if it generates them.


    print("Finished rebuilding blog images.")

if __name__ == "__main__":
    rebuild_blog_images()
