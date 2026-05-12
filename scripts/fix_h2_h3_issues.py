import os
import json
from bs4 import BeautifulSoup

def fix_h2_h3_issues_in_file(filepath):
    """
    Reads an HTML file, fixes H2/H3 hierarchy issues (H3 before H2, H3s in footer),
    and writes the modified content back to the file.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            html_content = f.read()

        soup = BeautifulSoup(html_content, 'html.parser')
        
        modified = False

        # Fix H3s that appear before any H2 in the main content
        main_content = soup.find('main')
        if main_content:
            h_tags_in_main = main_content.find_all(['h1', 'h2', 'h3'])
            found_h2 = False
            for tag in h_tags_in_main:
                if tag.name == 'h2':
                    found_h2 = True
                elif tag.name == 'h3' and not found_h2:
                    # Promote h3 to h2
                    tag.name = 'h2'
                    modified = True
                    # Since we promoted an h3 to an h2, now h2 is found
                    found_h2 = True 
        
        # Fix H3s in the footer (promote to H2 for consistency with audit)
        footer = soup.find('footer')
        if footer:
            for h3_tag in footer.find_all('h3'):
                h3_tag.name = 'h2'
                modified = True

        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(str(soup))
            print(f"Fixed H2/H3 issues in: {filepath}")
            return True
        else:
            #print(f"No H2/H3 issues found or fixed in: {filepath}")
            return False

    except Exception as e:
        print(f"Error processing file {filepath}: {e}")
        return False

def main():
    root_dir = "."
    fixed_files_count = 0
    for dirpath, _, filenames in os.walk(root_dir):
        # Skip node_modules, .vercel and venv directories
        if 'node_modules' in dirpath or '.vercel' in dirpath or 'venv' in dirpath:
            continue
        
        for filename in filenames:
            if filename.endswith(".html"):
                filepath = os.path.join(dirpath, filename)
                if fix_h2_h3_issues_in_file(filepath):
                    fixed_files_count += 1
    
    if fixed_files_count > 0:
        print(f"\nSuccessfully fixed H2/H3 issues in {fixed_files_count} files.")
    else:
        print("\nNo H2/H3 issues required fixing in any HTML files.")

if __name__ == "__main__":
    main()
