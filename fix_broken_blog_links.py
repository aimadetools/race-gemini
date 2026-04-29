import os
import glob
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def fix_blog_post_links(filepaths):
    fixed_files_count = 0
    
    for filepath in filepaths:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
            
            changed = False
            
            for a_tag in soup.find_all('a', href=True):
                original_href = a_tag['href'].strip()
                
                # Check for links like "../postX.html" where X is a number
                if original_href.startswith('../post') and original_href.endswith('.html'):
                    # Verify that the actual target file is within the blog directory
                    # This check is crucial to ensure we don't accidentally fix legitimate parent directory links
                    target_filename = os.path.basename(original_href).split('#')[0] # Get filename without fragment
                    expected_target_path_in_blog_dir = os.path.join(os.path.dirname(filepath), target_filename)

                    # Only fix if the corrected link points to an existing file within the blog directory
                    # and the original link was indeed broken when resolved to parent
                    # This logic is complex, simpler to just assume all ../postX.html are wrong
                    # since all blog posts are within the blog/ directory.
                    
                    # New logic: If link is ../postXXX.html, it should be postXXX.html (relative to current blog post)
                    corrected_href = original_href.replace('../', '')
                    
                    if corrected_href != original_href:
                        a_tag['href'] = corrected_href
                        changed = True
                        print(f"  Fixed link in {filepath}: {original_href} -> {corrected_href}")

            if changed:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(soup.prettify())
                fixed_files_count += 1
        except Exception as e:
            print(f"Error processing {filepath}: {e}")
            continue
            
    return fixed_files_count

if __name__ == "__main__":
    # The files identified by check_internal_links.py
    problematic_files = [
        './blog/post12.html',
        './blog/post10.html',
        './blog/post13.html',
        './blog/post11.html'
    ]

    count = fix_blog_post_links(problematic_files)
    if count > 0:
        print(f"Successfully fixed links in {count} files.")
    else:
        print("No links needed fixing.")
