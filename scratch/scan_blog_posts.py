import os
import re
import json

blog_dir = 'blog'
posts = []

for filename in os.listdir(blog_dir):
    if not filename.endswith('.html'):
        continue
    
    filepath = os.path.join(blog_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Extract title
    title_match = re.search(r'<title>(.*?)</title>', html, re.DOTALL)
    title = title_match.group(1).strip() if title_match else filename
    # Remove suffix if exists
    title = re.sub(r'\s*\|\s*LocalLeads\s*Blog\s*$', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*\|\s*LocalLeads\s*$', '', title, flags=re.IGNORECASE)
    
    # Extract description
    desc_match = re.search(r'<meta\s+[^>]*name=["\']description["\']\s+content=["\'](.*?)["\']', html, re.IGNORECASE)
    if not desc_match:
        desc_match = re.search(r'<meta\s+content=["\'](.*?)["\']\s+name=["\']description["\']', html, re.IGNORECASE)
    desc = desc_match.group(1).strip() if desc_match else "Learn local SEO tips and tricks to grow your small business with LocalLeads."
    
    # Extract datePublished from json-ld
    date_match = re.search(r'"datePublished"\s*:\s*["\'](.*?)["\']', html)
    date = date_match.group(1).strip() if date_match else None
    
    posts.append({
        'filename': filename,
        'title': title,
        'description': desc,
        'date': date
    })

# Sort posts by date descending, or name if no date
posts.sort(key=lambda p: (p['date'] or '', p['filename']), reverse=True)

print(json.dumps(posts, indent=2))
