import os
import re
from bs4 import BeautifulSoup
import json
from datetime import datetime

def add_article_schema(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Check if schema already exists to prevent duplicates
    if soup.find('script', {'type': 'application/ld+json', 'class': 'article-schema'}):
        print(f"Schema already exists in {file_path}. Skipping.")
        return

    # Extract data
    title_tag = soup.find('title')
    title = title_tag.text.strip() if title_tag else "Default Article Title"

    description_meta = soup.find('meta', {'name': 'description'})
    description = description_meta['content'].strip() if description_meta and 'content' in description_meta.attrs else "Default article description."

    og_image_meta = soup.find('meta', {'property': 'og:image'})
    image_url = og_image_meta['content'].strip() if og_image_meta and 'content' in og_image_meta.attrs else "https://www.localleads.com/images/default-blog-image.webp"

    og_url_meta = soup.find('meta', {'property': 'og:url'})
    canonical_url = og_url_meta['content'].strip() if og_url_meta and 'content' in og_url_meta.attrs else f"https://www.localleads.pro/{file_path}"
    
    # Get content from the blog-content section
    article_body = ""
    blog_content_section = soup.find('section', class_='blog-content')
    if blog_content_section:
        article_body = blog_content_section.get_text(separator=' ', strip=True)

    # Use a fixed author for now
    author_name = "LocalLeads Team"
    publisher_name = "LocalLeads"
    publisher_logo_url = "https://www.localleads.com/images/localleads-logo.png" # Assuming a default logo

    # Use today's date for article publication and modification date
    # In a real scenario, this would be extracted from the post's metadata
    current_date = datetime.now().isoformat()

    # Construct JSON-LD
    schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "image": [image_url],
        "datePublished": current_date,
        "dateModified": current_date,
        "author": {
            "@type": "Organization",
            "name": author_name
        },
        "publisher": {
            "@type": "Organization",
            "name": publisher_name,
            "logo": {
                "@type": "ImageObject",
                "url": publisher_logo_url
            }
        },
        "description": description,
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonical_url
        },
        "articleBody": article_body # Including the full article body for better SEO context
    }

    # Create a new script tag for the schema
    script_tag = soup.new_tag("script", type="application/ld+json", **{'class': 'article-schema'})
    script_tag.string = json.dumps(schema, indent=2)

    # Insert into head
    head_tag = soup.find('head')
    if head_tag:
        head_tag.append(script_tag)
    else:
        # If no head tag, which is unlikely for a valid HTML, add it to the body
        soup.body.insert(0, script_tag)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"Added Article schema to {file_path}")

def process_all_blog_posts(blog_dir):
    for root, _, files in os.walk(blog_dir):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                add_article_schema(file_path)

if __name__ == "__main__":
    blog_directory = "blog"
    if not os.path.exists(blog_directory):
        print(f"Error: Blog directory '{blog_directory}' not found.")
    else:
        process_all_blog_posts(blog_directory)
