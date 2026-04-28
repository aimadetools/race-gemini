from bs4 import BeautifulSoup
import glob
import os

def add_back_to_blog_link(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    main_tag = soup.find('main', class_='blog-post')

    if main_tag:
        # Check if the link already exists to prevent duplication
        existing_link = main_tag.find('a', class_='back-to-blog')
        if existing_link:
            print(f"Back to Blog link already exists in {file_path}. Skipping.")
            return

        # Create the new link element
        back_link_div = soup.new_tag('div', class_='back-to-blog-container')
        back_link = soup.new_tag('a', href='/blog.html')
        back_link['class'] = 'back-to-blog'
        back_link.string = '← Back to Blog'
        back_link_div.append(back_link)

        # Insert it at the beginning of the main tag
        main_tag.insert(0, back_link_div)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
        print(f"Added Back to Blog link to {file_path}")
    else:
        print(f"Could not find <main class='blog-post'> in {file_path}")

if __name__ == '__main__':
    script_dir = os.path.dirname(__file__)
    blog_posts_pattern = os.path.join(script_dir, 'blog', 'post*.html')
    
    for file_path in glob.glob(blog_posts_pattern):
        add_back_to_blog_link(file_path)
