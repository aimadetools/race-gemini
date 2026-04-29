import os
import glob
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin

def check_internal_links(project_root="."):
    html_files = glob.glob(os.path.join(project_root, '**/*.html'), recursive=True)
    
    broken_links = []

    # Exclude files in node_modules and venv
    html_files = [f for f in html_files if "node_modules" not in f and "venv" not in f]

    print(f"Checking internal links in {len(html_files)} HTML files...")

    for filepath in html_files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
            
            for a_tag in soup.find_all('a', href=True):
                href = a_tag['href'].strip()

                # Treat fragment identifiers as valid for internal links
                if href.startswith('#'):
                    continue

                parsed_href = urlparse(href)

                # Check if it's an internal link
                # A link is internal if it's a relative path or starts with '/' and is not a full external URL
                if not parsed_href.scheme and not parsed_href.netloc: # Relative path or absolute path within the same domain
                    # Construct the absolute path for the target file
                    if href.startswith('/'): # Absolute path from root
                        target_path = os.path.join(project_root, href[1:])
                    else: # Relative path from current file
                        base_dir = os.path.dirname(filepath)
                        target_path = os.path.abspath(os.path.join(base_dir, href))
                    
                    # Remove fragment identifier for file existence check
                    target_path_no_fragment = target_path.split('#')[0]

                    # Ensure the path is within the project root to avoid checking system files
                    if os.path.commonprefix([os.path.abspath(project_root), target_path_no_fragment]) != os.path.abspath(project_root):
                        continue # Skip links outside the project root
                    
                    if not os.path.exists(target_path_no_fragment):
                        broken_links.append({
                            "source_file": filepath,
                            "broken_link": href,
                            "resolved_path_attempt": target_path_no_fragment,
                            "reason": "Internal file does not exist"
                        })
        except Exception as e:
            print(f"Error processing {filepath}: {e}")
            continue
            
    return broken_links

if __name__ == "__main__":
    problematic_links = check_internal_links()
    
    if problematic_links:
        print("--- Broken Internal Links Found ---") # Corrected this line
        for item in problematic_links:
            print(f"Source: {item['source_file']}")
            print(f"  Broken link: {item['broken_link']}")
            print(f"  Attempted path: {item['resolved_path_attempt']}")
            print(f"  Reason: {item['reason']}")
            print("------------------------------") # Corrected this line
    else:
        print("No broken internal links found.")
