import os
import glob
from bs4 import BeautifulSoup

def fix_blog_meta_keywords(blog_dir="blog/", default_keywords="local SEO, small business SEO, local marketing, local search, Google Business Profile"):
    updated_files_count = 0
    html_files = glob.glob(os.path.join(blog_dir, '**/*.html'), recursive=True)

    for filepath in html_files:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
            
            changed = False
            
            # Find existing meta keywords tag
            meta_keywords_tag = soup.find("meta", attrs={"name": "keywords"})
            
            if meta_keywords_tag:
                # If tag exists but content is empty, update it
                if not meta_keywords_tag.get("content", "").strip():
                    meta_keywords_tag["content"] = default_keywords
                    changed = True
            else:
                # If tag does not exist, create and insert it
                new_meta_keywords_tag = soup.new_tag("meta")
                new_meta_keywords_tag["name"] = "keywords"
                new_meta_keywords_tag["content"] = default_keywords
                
                # Try to insert after meta description, or at the end of head
                meta_description_tag = soup.find("meta", attrs={"name": "description"})
                if meta_description_tag:
                    meta_description_tag.insert_after(new_meta_keywords_tag)
                else:
                    head_tag = soup.find("head")
                    if head_tag:
                        head_tag.append(new_meta_keywords_tag)
                changed = True
            
            if changed:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(soup.prettify())
                updated_files_count += 1
                print(f"  Updated keywords in {filepath}")

        except Exception as e:
            print(f"Error processing {filepath}: {e}")
            continue
            
    return updated_files_count

if __name__ == "__main__":
    count = fix_blog_meta_keywords()
    if count > 0:
        print(f"Successfully updated meta keywords in {count} files.")
    else:
        print("No meta keywords needed fixing.")
