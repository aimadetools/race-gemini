import os
import re

def fix_social_links():
    blog_dir = "blog"
    social_icons = ["twitter-icon.webp", "facebook-icon.webp", "linkedin-icon.webp"]

    for i in range(428, 438): # From post428.html to post437.html
        file_path = os.path.join(blog_dir, f"post{i}.html")
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        modified_content = content
        for icon in social_icons:
            old_path = f'../images/{icon}'
            new_path = f'../../images/{icon}'
            modified_content = modified_content.replace(old_path, new_path)
        
        if modified_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(modified_content)
            print(f"Fixed social links in {file_path}")
        else:
            print(f"No changes needed for {file_path}")

if __name__ == "__main__":
    fix_social_links()
