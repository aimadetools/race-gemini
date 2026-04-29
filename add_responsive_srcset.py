import os
from bs4 import BeautifulSoup

def add_responsive_srcset(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Find all img tags that don't have a srcset attribute
    images_to_update = soup.find_all('img', srcset=False)

    for img in images_to_update:
        src = img.get('src')
        if src:
            # Construct srcset and sizes based on a common pattern
            # This assumes that different sized versions of the image (e.g., -480w, -800w) exist
            # or will be generated. We'll prioritize .webp format.
            base_name, ext = os.path.splitext(src)
            
            # Remove any existing .webp extension if present to append sizes correctly
            if ext.lower() == '.webp':
                base_name = os.path.splitext(base_name)[0]

            # Generate srcset values. Adjust these as needed for actual image sizes.
            # We assume images are in the same directory structure.
            srcset_values = []
            
            # Add original src as a fallback or largest size in webp if not already webp
            # Attempt to use webp for all srcset entries
            webp_src = base_name + ".webp"
            srcset_values.append(f"{webp_src} 1200w") # Assuming 1200w as a large default

            # Add smaller sizes if they are expected to exist
            # Note: This is a placeholder for actual generated responsive images.
            # In a real scenario, you'd check if these files actually exist.
            if os.path.exists(base_name + "-800w.webp"): # Example check
                srcset_values.append(f"{base_name}-800w.webp 800w")
            if os.path.exists(base_name + "-480w.webp"): # Example check
                srcset_values.append(f"{base_name}-480w.webp 480w")

            # If no specific webp sizes are found/assumed, at least provide the original as a webp
            if not srcset_values:
                 srcset_values.append(f"{webp_src} 1200w") # Fallback to original webp

            # Sort srcset values by width, descending for browser to pick largest first
            srcset_values.sort(key=lambda x: int(x.split(' ')[1][:-1]), reverse=True)
            img['srcset'] = ", ".join(srcset_values)
            
            # Add sizes attribute (common pattern for full-width blog images)
            img['sizes'] = "(max-width: 768px) 100vw, 800px" # Adjust as per your CSS layout

            # Add loading="lazy" if not present
            if 'loading' not in img.attrs:
                img['loading'] = 'lazy'
            
            print(f"Updated <img> tag in {file_path}: {src} -> {img['srcset']}")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))

def process_all_blog_posts_for_srcset(blog_dir):
    for root, _, files in os.walk(blog_dir):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                add_responsive_srcset(file_path)

if __name__ == "__main__":
    blog_directory = "blog"
    if not os.path.exists(blog_directory):
        print(f"Error: Blog directory '{blog_directory}' not found.")
    else:
        process_all_blog_posts_for_srcset(blog_directory)
