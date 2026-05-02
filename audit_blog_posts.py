import os
import re
from bs4 import BeautifulSoup
import argparse

def analyze_post(file_path):
    """
    Analyzes a single blog post for SEO and readability metrics.
    """
    results = {
        'file': os.path.basename(file_path),
        'errors': [],
        'warnings': []
    }

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        results['errors'].append(f"Error reading file: {e}")
        return results

    soup = BeautifulSoup(content, 'lxml')

    # 1. Check for meta description and length
    description = soup.find('meta', attrs={'name': 'description'})
    if not description:
        results['errors'].append("Missing meta description.")
    elif not description.get('content'):
        results['errors'].append("Meta description is empty.")
    else:
        desc_len = len(description.get('content'))
        if not 50 <= desc_len <= 160:
            results['warnings'].append(f"Meta description length is {desc_len} characters (ideal: 50-160).")

    # 2. Check for a single h1 tag
    h1_tags = soup.find_all('h1')
    if len(h1_tags) == 0:
        results['errors'].append("Missing h1 tag.")
    elif len(h1_tags) > 1:
        results['warnings'].append(f"Found {len(h1_tags)} h1 tags (ideal: 1).")

    # 3. Check for image alt attributes
    images = soup.find_all('img')
    for i, img in enumerate(images):
        if not img.get('alt') or len(img.get('alt').strip()) == 0:
            results['warnings'].append(f"Image {i+1} is missing an alt attribute.")

    # 4. Check for word count
    body_text = soup.get_text()
    word_count = len(re.findall(r'\w+', body_text))
    if word_count < 300:
        results['warnings'].append(f"Word count is {word_count} (recommended: >300).")

    # 5. Check for canonical link
    canonical = soup.find('link', attrs={'rel': 'canonical'})
    if not canonical:
        results['errors'].append("Missing canonical link tag.")
    elif not canonical.get('href'):
        results['errors'].append("Canonical link is empty.")

    return results

def main():
    """
    Main function to audit all blog posts.
    """
    parser = argparse.ArgumentParser(description='Audit blog posts for SEO and readability.')
    parser.add_argument('directory', nargs='?', default='blog', help='The directory containing the blog posts.')
    args = parser.parse_args()

    blog_dir = args.directory
    if not os.path.isdir(blog_dir):
        print(f"Error: Directory not found at '{blog_dir}'")
        return

    all_results = []
    for filename in os.listdir(blog_dir):
        if filename.endswith('.html'):
            file_path = os.path.join(blog_dir, filename)
            all_results.append(analyze_post(file_path))

    # Print a summary report
    print("--- Blog Post Audit Report ---")
    for result in all_results:
        if result['errors'] or result['warnings']:
            print(f"File: {result['file']}")
            for error in result['errors']:
                print(f"  - [ERROR] {error}")
            for warning in result['warnings']:
                print(f"  - [WARNING] {warning}")

    print("\n--- Audit Complete ---")

if __name__ == '__main__':
    main()
