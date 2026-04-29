import os
import glob
from bs4 import BeautifulSoup

def audit_image_alt_attributes(project_root="."):
    html_files = glob.glob(os.path.join(project_root, '**/*.html'), recursive=True)
    
    problem_images = []

    # Exclude files in node_modules and venv
    html_files = [f for f in html_files if "node_modules" not in f and "venv" not in f]

    print(f"Auditing image alt attributes in {len(html_files)} HTML files...")

    for filepath in html_files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
            
            for img_tag in soup.find_all('img'):
                alt_attr = img_tag.get('alt', '').strip()
                img_src = img_tag.get('src', 'no-src').strip()

                if not alt_attr:
                    problem_images.append({
                        "filepath": filepath,
                        "img_src": img_src,
                        "reason": "Missing or empty alt attribute"
                    })
                elif len(alt_attr.split()) < 2 or alt_attr.lower() in ["image", "photo", "graphic", "picture", "logo"]:
                    problem_images.append({
                        "filepath": filepath,
                        "img_src": img_src,
                        "current_alt": alt_attr,
                        "reason": "Generic or too short alt attribute"
                    })

        except Exception as e:
            print(f"Error processing {filepath}: {e}")
            continue
            
    return problem_images

if __name__ == "__main__":
    problematic_images = audit_image_alt_attributes()
    
    if problematic_images:
        print("") # Print a newline
        print("--- Problematic Images Found ---")
        for item in problematic_images:
            print(f"File: {item['filepath']}")
            print(f"  Image src: {item['img_src']}")
            if 'current_alt' in item:
                print(f"  Current alt: '{item['current_alt']}'")
            print(f"  Reason: {item['reason']}")
            print("-" * 30)
    else:
        print("All images seem to have appropriate alt attributes.")

