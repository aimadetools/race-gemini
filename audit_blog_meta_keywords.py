import os
import glob
from bs4 import BeautifulSoup

def audit_meta_keywords(blog_dir="blog/"):
    missing_keywords_posts = []
    for filename in os.listdir(blog_dir):
        if filename.endswith(".html") and filename.startswith("post"):
            filepath = os.path.join(blog_dir, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            soup = BeautifulSoup(content, "html.parser")
            
            meta_keywords_tag = soup.find("meta", attrs={"name": "keywords"})
            keywords = meta_keywords_tag.get("content", "").strip() if meta_keywords_tag else ""

            # Define what constitutes "missing or generic" for keywords
            # For now, just check if it's completely missing or empty
            if not keywords:
                missing_keywords_posts.append({
                    "filename": filename,
                    "keywords": keywords
                })
    return missing_keywords_posts

if __name__ == "__main__":
    problem_posts = audit_meta_keywords()
    
    if problem_posts:
        print("Blog posts with missing meta keywords:")
        for post in problem_posts:
            print(f"- {post['filename']}:")
            print(f"  Keywords: '{post['keywords']}'")
            print("-" * 30)
    else:
        print("All blog posts seem to have meta keywords.")
