import os
import re

def add_scroll_to_top_to_html(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add CSS link
    # Determine the correct path for the CSS file
    path_parts = file_path.split(os.sep)
    if "blog" in path_parts or "es" in path_parts:
        css_link = '<link href="../style_scroll_to_top.css" rel="stylesheet"/>'
    else:
        css_link = '<link href="style_scroll_to_top.css" rel="stylesheet"/>'

    # Check if the CSS link already exists
    if re.search(re.escape(css_link), content) is None:
        head_close_pattern = r'(</head>)'
        # Use f-string with explicit 
 and proper grouping for replacement
        content = re.sub(head_close_pattern, lambda m: f'  {css_link}
{m.group(1)}', content, 1)

    # 2. Add button HTML before </body>
    button_html = '<button id="scrollToTopBtn" title="Go to top"><i class="fas fa-arrow-up"></i></button>'
    if re.search(re.escape(button_html), content) is None:
        body_close_pattern = r'(</body>)'
        # Use f-string with explicit 
 and proper grouping for replacement
        content = re.sub(body_close_pattern, lambda m: f'  {button_html}
{m.group(1)}', content, 1)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    root_dir = "."
    files_to_modify = []

    # Collect all HTML files
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(".html"):
                file_path = os.path.join(dirpath, filename)
                # Exclude specific files and directories
                if "sample-page-template.html" in file_path or 
                   "page-template.html" in file_path or 
                   "sample-pages" in file_path or 
                   "node_modules" in file_path or 
                   "venv" in file_path or 
                   "__pycache__" in file_path:
                    continue
                files_to_modify.append(file_path)

    # Sort to ensure consistent processing
    files_to_modify.sort()

    for file_path in files_to_modify:
        try:
            add_scroll_to_top_to_html(file_path)
            print(f"Modified: {file_path}")
        except Exception as e:
            print(f"Error modifying {file_path}: {e}")

if __name__ == "__main__":
    main()
