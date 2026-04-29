import os
from bs4 import BeautifulSoup

def audit_blog_posts(blog_dir="blog/"):
    missing_seo_posts = []
    for filename in os.listdir(blog_dir):
        if filename.endswith(".html") and filename.startswith("post"):
            filepath = os.path.join(blog_dir, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            soup = BeautifulSoup(content, "html.parser")
            
            title_tag = soup.find("title")
            title = title_tag.get_text(strip=True) if title_tag else ""

            meta_description_tag = soup.find("meta", attrs={"name": "description"})
            description = meta_description_tag.get("content", "").strip() if meta_description_tag else ""

            # Check for missing or generic descriptions/titles
            if not title or "No description available" in description or not description:
                missing_seo_posts.append({
                    "filename": filename,
                    "title": title,
                    "description": description
                })
    return missing_seo_posts

if __name__ == "__main__":
    problem_posts = audit_blog_posts()
    
    if problem_posts:
        print("Blog posts with missing or generic titles/meta descriptions:")
        for post in problem_posts:
            print(f"- {post['filename']}:")
            print(f"  Title: '{post['title']}'")
            print(f"  Description: '{post['description']}'")
            print("-" * 30)
    else:
        print("All blog posts seem to have proper titles and meta descriptions.")

