import os
from bs4 import BeautifulSoup

def fix_html_file(file_path):
    """
    Fixes an HTML file by truncating title and meta description tags if they are too long.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        soup = BeautifulSoup(content, 'html.parser')
        
        modified = False

        # --- Title Tag ---
        title_tag = soup.find('title')
        if title_tag:
            title_text = title_tag.get_text(strip=True)
            if len(title_text) > 70:
                new_title_text = title_text[:67] + "..."
                title_tag.string = new_title_text
                modified = True

        # --- Meta Description Tag ---
        meta_description_tag = soup.find('meta', attrs={'name': 'description'})
        if meta_description_tag:
            meta_description_content = meta_description_tag.get('content', '').strip()
            # Removed truncation logic for meta description. 
            # Descriptions should be crafted to optimal length during content generation.
        
        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(str(soup))
            return True
        return False

    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
        return False

def main():
    blog_dir = 'blog'
    fixed_files_count = 0

    if not os.path.isdir(blog_dir):
        print(f"Error: Directory '{blog_dir}' not found.")
        return

    html_files = [f for f in os.listdir(blog_dir) if f.endswith('.html')]
    
    print(f"Attempting to fix {len(html_files)} HTML files in '{blog_dir}'...")

    for filename in html_files:
        file_path = os.path.join(blog_dir, filename)
        if fix_html_file(file_path):
            fixed_files_count += 1
    
    print("""
--- Fix Complete ---""")
    print(f"Total files processed: {len(html_files)}")
    print(f"Total files fixed: {fixed_files_count}")

if __name__ == "__main__":
    main()