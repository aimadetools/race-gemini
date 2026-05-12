import os
import re

def count_words(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        # Remove HTML tags
        content = re.sub(r'<[^>]+>', '', content)
        # Count words
        words = content.split()
        return len(words)

if __name__ == "__main__":
    blog_dir = "blog"
    files = [f for f in os.listdir(blog_dir) if f.endswith(".html")]
    
    for file in files:
        filepath = os.path.join(blog_dir, file)
        word_count = count_words(filepath)
        if word_count < 300:
            print(f"{filepath}: {word_count}")
