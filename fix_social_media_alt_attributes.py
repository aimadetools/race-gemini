import os
import glob
from bs4 import BeautifulSoup

def fix_social_media_alt_attributes(project_root="."):
    html_files = glob.glob(os.path.join(project_root, '**/*.html'), recursive=True)
    
    updated_files_count = 0

    # Exclude files in node_modules and venv
    html_files = [f for f in html_files if "node_modules" not in f and "venv" not in f]

    print(f"Fixing social media alt attributes in {len(html_files)} HTML files...")

    for filepath in html_files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
            
            changed = False
            
            for img_tag in soup.find_all('img'):
                img_src = img_tag.get('src', '').lower()
                current_alt = img_tag.get('alt', '').strip()
                new_alt = None

                if "facebook-icon.webp" in img_src and current_alt.lower() == "facebook":
                    new_alt = "Link to LocalLeads Facebook page"
                elif "twitter-icon.webp" in img_src and current_alt.lower() == "twitter":
                    new_alt = "Link to LocalLeads Twitter page"
                elif "linkedin-icon.webp" in img_src and current_alt.lower() == "linkedin":
                    new_alt = "Link to LocalLeads LinkedIn page"
                
                if new_alt and current_alt != new_alt:
                    img_tag['alt'] = new_alt
                    changed = True

            if changed:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(soup.prettify())
                updated_files_count += 1
                print(f"  Updated {filepath}")

        except Exception as e:
            print(f"Error processing {filepath}: {e}")
            continue
            
    return updated_files_count

if __name__ == "__main__":
    count = fix_social_media_alt_attributes()
    if count > 0:
        print(f"Successfully updated alt attributes in {count} files.")
    else:
        print("No social media alt attributes needed fixing.")
