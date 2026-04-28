import os
from bs4 import BeautifulSoup

def fix_blog_descriptions():
    blog_html_path = 'blog.html'
    if not os.path.exists(blog_html_path):
        print(f"Error: {blog_html_path} not found.")
        return

    with open(blog_html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    articles = soup.find_all('article', class_='blog-preview')
    for article in articles:
        p_tag = article.find('p')
        if p_tag and p_tag.get_text(strip=True) == "No description available.":
            link = article.find('a')['href']
            post_path = link.strip('/')
            if os.path.exists(post_path):
                with open(post_path, 'r', encoding='utf-8') as post_file:
                    post_soup = BeautifulSoup(post_file, 'html.parser')
                    description_tag = post_soup.find('meta', attrs={'name': 'description'})
                    if description_tag and description_tag.get('content'):
                        p_tag.string = description_tag.get('content')

    with open(blog_html_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))

if __name__ == "__main__":
    fix_blog_descriptions()
    print("Successfully fixed blog descriptions.")
