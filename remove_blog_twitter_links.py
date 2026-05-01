import os
from bs4 import BeautifulSoup

def remove_twitter_links_from_html(file_path):
    """
    Removes the Twitter social icon link from the footer of an HTML file.
    """
    modified = False
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        soup = BeautifulSoup(content, 'html.parser')
        
        # Find the social icons div in the footer
        footer_social_icons = soup.find('footer')
        if footer_social_icons:
            twitter_link = footer_social_icons.find('a', attrs={'aria-label': 'Twitter'})
            if twitter_link:
                twitter_link.decompose() # Remove the tag
                modified = True
                print(f"Removed Twitter link from {file_path}")
        
        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(str(soup))
            return True
        return False

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    blog_dir = 'blog'
    modified_files_count = 0

    if not os.path.isdir(blog_dir):
        print(f"Error: Directory '{blog_dir}' not found.")
        return

    html_files = [f for f in os.listdir(blog_dir) if f.endswith('.html')]
    
    print(f"Attempting to remove Twitter links from {len(html_files)} HTML files in '{blog_dir}'...")

    for filename in html_files:
        file_path = os.path.join(blog_dir, filename)
        if remove_twitter_links_from_html(file_path):
            modified_files_count += 1
    
    print(f"Total files processed: {len(html_files)}")
    print(f"Total files with Twitter links removed: {modified_files_count}")

if __name__ == "__main__":
    main()
