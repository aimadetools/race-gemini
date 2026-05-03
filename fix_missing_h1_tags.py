import os
from bs4 import BeautifulSoup

def fix_h1_tag(file_path):
    """
    Ensures optimal h1 tag usage in an HTML file:
    - Adds an h1 tag if missing, deriving content from the title.
    - Converts all h1 tags after the first one to h2 tags.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return

    soup = BeautifulSoup(content, 'lxml')
    initial_soup_str = str(soup) # Store initial state to check for changes

    h1_tags = soup.find_all('h1')

    if not h1_tags:
        # No h1 tags found, add one from the title
        title_tag = soup.find('title')
        if not title_tag or not title_tag.string:
            print(f"Warning: No title found in {file_path}. Cannot create h1 tag.")
            return

        h1_tag = soup.new_tag('h1')
        h1_tag.string = title_tag.string.strip()

        main_content = soup.find('main') or soup.find('body')
        if main_content:
            container = main_content.find('div', class_='container')
            if container:
                container.insert(0, h1_tag)
            else:
                main_content.insert(0, h1_tag)
            print(f"Added missing h1 tag to: {os.path.basename(file_path)}")
        else:
            print(f"Warning: Could not find a <main> or <body> tag in {file_path}. Cannot insert h1 tag.")
            return
    elif len(h1_tags) > 1:
        # Multiple h1 tags found, convert subsequent ones to h2
        for i, h1 in enumerate(h1_tags):
            if i > 0: # Skip the first h1
                h1.name = 'h2'
                print(f"Converted extra h1 tag to h2 in: {os.path.basename(file_path)}")
    # No 'else' for exactly one h1 tag as we just return early in that case.

    # Only write if changes were made
    if str(soup) != initial_soup_str:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(str(soup))
            print(f"Updated h1 tag(s) in: {os.path.basename(file_path)}")
        except Exception as e:
            print(f"Error writing to file {file_path}: {e}")


def main():
    """
    Main function to fix missing h1 tags in all blog posts.
    """
    blog_dir = 'blog'
    if not os.path.isdir(blog_dir):
        print(f"Error: Directory not found at '{blog_dir}'")
        return

    print("--- Fixing Missing H1 Tags ---")
    for filename in os.listdir(blog_dir):
        if filename.endswith('.html'):
            file_path = os.path.join(blog_dir, filename)
            fix_h1_tag(file_path)
    print("\n--- Finished ---")

if __name__ == '__main__':
    main()
