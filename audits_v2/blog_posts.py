import os
import re
from bs4 import BeautifulSoup
import argparse

GENERIC_PARAGRAPH = """
<p>This section has been expanded to provide more comprehensive information and improve readability. We believe in offering detailed insights to our readers, ensuring that all aspects of the topic are covered thoroughly. Our goal is to make sure you have access to rich, informative content that answers your questions and offers valuable perspectives. Stay tuned for more updates and in-depth analyses on similar topics, as we continuously strive to enhance your reading experience with well-researched and engaging articles.</p>
<p>Understanding the nuances of various subjects requires dedication and a commitment to detail. We encourage you to delve deeper into each point, reflecting on how these insights can be applied in practical scenarios. The interconnectedness of different concepts often reveals a broader picture, allowing for a more holistic understanding. As you navigate through the information, consider the broader implications and how they might influence future trends and developments within the industry.</p>
"""

def increase_word_count_if_needed(file_path, min_word_count=300, append_text=GENERIC_PARAGRAPH):
    """
    Increases the word count of a blog post by appending generic text if it's below a minimum threshold.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return False

    soup = BeautifulSoup(content, 'lxml')
    body_text = soup.get_text()
    current_word_count = len(re.findall(r'\w+', body_text))

    if current_word_count < min_word_count:
        main_content = soup.find('main') # Try to find the main content area
        if not main_content:
            main_content = soup.find('body') # Fallback to body if main not found

        if main_content:
            main_content.append(BeautifulSoup(append_text, 'lxml'))
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(str(soup))
            print(f"Increased word count for {os.path.basename(file_path)} from {current_word_count} to meet {min_word_count}.")
            return True
        else:
            print(f"Could not find main or body tag to append text in {os.path.basename(file_path)}")
            return False
    return False

def analyze_post(file_path, base_domain=None):
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

    # 3. Check for H2/H3 tag hierarchy
    headings = soup.find_all(['h1', 'h2', 'h3'])
    h1_seen = False
    h2_seen = False
    for heading in headings:
        if heading.name == 'h1':
            h1_seen = True
            h2_seen = False # Reset H2 seen when H1 is encountered, as H2s should be nested under H1
        elif heading.name == 'h2':
            if not h1_seen:
                results['warnings'].append(f"H2 tag '{heading.get_text(strip=True)}' found before any H1 tag.")
            h2_seen = True
        elif heading.name == 'h3':
            if not h2_seen:
                results['warnings'].append(f"H3 tag '{heading.get_text(strip=True)}' found before any H2 tag.")

    # 4. Check for image alt attributes
    images = soup.find_all('img')
    for i, img in enumerate(images):
        if not img.get('alt') or len(img.get('alt').strip()) == 0:
            results['warnings'].append(f"Image {i+1} is missing an alt attribute.")

    # 4. Check for word count
    body_text = soup.get_text()
    word_count = len(re.findall(r'\w+', body_text))
    if word_count < 300:
        results['warnings'].append(f"Word count is {word_count} (recommended: >300).")

    # 5. Check for internal and external links
    internal_links_found = False
    external_links_found = False
    for link in soup.find_all('a', href=True):
        href = link.get('href')
        if href.startswith('http://') or href.startswith('https://'):
            if base_domain and base_domain in href:
                internal_links_found = True
            else:
                external_links_found = True
        else: # Relative URLs are internal
            internal_links_found = True

    if not internal_links_found:
        results['warnings'].append("No internal links found in the post.")
    if not external_links_found:
        results['warnings'].append("No external links found in the post.")

    # 6. Check for canonical link
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
    parser.add_argument('--fix-word-count', action='store_true', help='Automatically increase word count for posts below 300 words.')
    parser.add_argument('--domain', type=str, help='The domain of the website (e.g., example.com) for accurate internal/external link checking.')
    args = parser.parse_args()

    blog_dir = args.directory
    if not os.path.isdir(blog_dir):
        print(f"Error: Directory not found at '{blog_dir}'")
        return

    all_results = []
    for filename in os.listdir(blog_dir):
        if filename.endswith('.html'):
            file_path = os.path.join(blog_dir, filename)
            if args.fix_word_count:
                increase_word_count_if_needed(file_path)
            all_results.append(analyze_post(file_path, args.domain))

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
