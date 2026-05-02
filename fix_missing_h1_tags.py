import os
from bs4 import BeautifulSoup

def fix_h1_tag(file_path):
    """
    Adds an h1 tag to a blog post if it's missing.
    The h1 content will be derived from the title tag.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return

    soup = BeautifulSoup(content, 'lxml')

    # Check if an h1 tag already exists
    if soup.find('h1'):
        return # Do nothing if an h1 tag is present

    # Get the title
    title_tag = soup.find('title')
    if not title_tag or not title_tag.string:
        print(f"Warning: No title found in {file_path}. Cannot create h1 tag.")
        return

    # Create the h1 tag
    h1_tag = soup.new_tag('h1')
    h1_tag.string = title_tag.string.strip()

    # Find the main content area to prepend the h1 tag
    # This is a guess, might need refinement based on actual HTML structure
    main_content = soup.find('main') or soup.find('body')
    if main_content:
        # Prepending inside a container div if one exists, for better structure
        container = main_content.find('div', class_='container')
        if container:
            container.insert(0, h1_tag)
        else:
            main_content.insert(0, h1_tag)
    else:
        print(f"Warning: Could not find a <main> or <body> tag in {file_path}. Cannot insert h1 tag.")
        return

    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
        print(f"Fixed missing h1 tag in: {os.path.basename(file_path)}")
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
