import os
import re
from bs4 import BeautifulSoup

def audit_html_file(file_path):
    """
    Audits an HTML file for the presence and content length of title and meta description tags.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        soup = BeautifulSoup(content, 'html.parser')
        
        # --- Title Tag ---
        title_tag = soup.find('title')
        title_text = title_tag.get_text(strip=True) if title_tag else ""
        title_length = len(title_text)

        # --- Meta Description Tag ---
        meta_description_tag = soup.find('meta', attrs={'name': 'description'})
        meta_description_content = meta_description_tag.get('content', '').strip() if meta_description_tag else ""
        meta_description_length = len(meta_description_content)

        issues = []
        if not title_tag:
            issues.append("Missing <title> tag")
        elif not title_text:
            issues.append("Empty <title> tag")
        elif not (30 <= title_length <= 70):  # Typical SEO recommendation
            issues.append(f"Title length ({title_length}) not optimal (30-70 chars)")

        if not meta_description_tag:
            issues.append('Missing <meta name="description"> tag')
        elif not meta_description_content:
            issues.append('Empty <meta name="description"> tag content')
        elif not (50 <= meta_description_length <= 160):  # Typical SEO recommendation
            issues.append(f"Meta description length ({meta_description_length}) not optimal (50-160 chars)")

        return {
            'file_path': file_path,
            'title': title_text,
            'title_length': title_length,
            'meta_description': meta_description_content,
            'meta_description_length': meta_description_length,
            'issues': issues
        }

    except Exception as e:
        return {'file_path': file_path, 'error': str(e)}

def main():
    blog_dir = 'blog'
    audit_results = []

    if not os.path.isdir(blog_dir):
        print(f"Error: Directory '{blog_dir}' not found.")
        return

    html_files = [f for f in os.listdir(blog_dir) if f.endswith('.html')]
    
    print(f"Auditing {len(html_files)} HTML files in '{blog_dir}'...")

    for filename in sorted(html_files): # Sort for consistent output
        file_path = os.path.join(blog_dir, filename)
        result = audit_html_file(file_path)
        audit_results.append(result)

    # Print a summary report
    print("""
--- SEO Audit Report ---""")
    
    total_issues = 0
    for result in audit_results:
        if result.get('error'):
            print(f"File: {result['file_path']} - Error: {result['error']}")
        elif result['issues']:
            total_issues += len(result['issues'])
            print(f"""
File: {result['file_path']}""")
            print(f'  Title: "{result["title"]}" ({result["title_length"]} chars)') # Corrected here
            print(f'  Meta Description: "{result["meta_description"]}" ({result["meta_description_length"]} chars)') # Corrected here
            print("  Issues:")
            for issue in result['issues']:
                print(f"    - {issue}")
        # else:
        #     print(f"File: {result['file_path']} - OK") # Uncomment to see all files

    print(f"""
--- Audit Complete ---""")
    print(f"Total files audited: {len(audit_results)}")
    print(f"Total issues found across all files: {total_issues}")

if __name__ == "__main__":
    main()
