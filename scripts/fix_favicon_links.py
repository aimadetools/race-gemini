import os
import re

def replace_multiple_favicon_links(file_path):
    replacements = [
        # SVG favicon (non-minified and minified)
        ('<link href="/favicon.svg" rel="icon" type="image/svg+xml"/>', '<link href="/images/favicon.png" rel="icon" type="image/png"/>'),
        ('<link href="/favicon.svg" rel="icon" type="image/svg+xml"/>'.replace(' />', '/>'), '<link href="/images/favicon.png" rel="icon" type="image/png"/>'),
        
        # ICO favicon with relative path (non-minified and minified)
        ('<link href="../favicon.ico" rel="icon" type="image/x-icon"/>', '<link href="../images/favicon.png" rel="icon" type="image/png"/>'),
        ('<link href="../favicon.ico" rel="icon" type="image/x-icon"/>'.replace(' />', '/>'), '<link href="../images/favicon.png" rel="icon" type="image/png"/>'),

        # ICO favicon with absolute path (non-minified and minified)
        ('<link href="/favicon.ico" rel="icon" type="image/x-icon"/>', '<link href="/images/favicon.png" rel="icon" type="image/png"/>'),
        ('<link href="/favicon.ico" rel="icon" type="image/x-icon"/>'.replace(' />', '/>'), '<link href="/images/favicon.png" rel="icon" type="image/png"/>'),
    ]

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        for old_string, new_string in replacements:
            content = content.replace(old_string, new_string)

        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated favicon links in {file_path}")
        else:
            print(f"No relevant favicon links found in {file_path}, skipping.")

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    # Get all HTML files
    html_files = []
    for root, _, files in os.walk("."):
        for file in files:
            if file.endswith(".html"):
                html_files.append(os.path.join(root, file))

    for html_file in html_files:
        replace_multiple_favicon_links(html_file)
