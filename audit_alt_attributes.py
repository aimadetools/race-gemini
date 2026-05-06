import argparse
import json
import os
import sys
import requests
from bs4 import BeautifulSoup
from glob import glob

def audit_alt_attributes(html_content, file_path):
    """
    Audits HTML content for <img> tags missing alt attributes or having empty alt attributes.
    Returns a list of dictionaries, each describing an issue.
    """
    issues = []
    soup = BeautifulSoup(html_content, 'html.parser')
    for img_tag in soup.find_all('img'):
        if not img_tag.has_attr('alt') or not img_tag['alt'].strip():
            issues.append({
                "type": "Missing or Empty Alt Attribute",
                "file": file_path,
                "element": str(img_tag),
                "src": img_tag.get('src', 'N/A')
            })
    return issues

def main():
    parser = argparse.ArgumentParser(description='Audit images for missing alt attributes in HTML files or from a URL.')
    parser.add_argument('--dir', help='Directory containing HTML files to audit.')
    parser.add_argument('--url', help='URL of a page to audit.')
    args = parser.parse_args()

    all_issues = []
    if args.dir:
        if not os.path.isdir(args.dir):
            print(json.dumps({"error": f"Directory not found: {args.dir}"}))
            sys.exit(1)
        for filepath in glob(os.path.join(args.dir, '**', '*.html'), recursive=True):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    html_content = f.read()
                all_issues.extend(audit_alt_attributes(html_content, filepath))
            except Exception as e:
                all_issues.append({"error": f"Could not process file {filepath}: {e}"})
    elif args.url:
        try:
            response = requests.get(args.url, timeout=10)
            response.raise_for_status()
            html_content = response.text
            all_issues.extend(audit_alt_attributes(html_content, args.url))
        except requests.exceptions.RequestException as e:
            print(json.dumps({"error": f"Failed to fetch URL: {e}"}))
            sys.exit(1)
    else:
        print(json.dumps({"error": "Either --dir or --url must be provided."}))
        sys.exit(1)

    if all_issues:
        print(json.dumps(all_issues, indent=2))
        sys.exit(1)
    else:
        print(json.dumps({"message": "No issues found."}))
        sys.exit(0)

if __name__ == "__main__":
    main()
