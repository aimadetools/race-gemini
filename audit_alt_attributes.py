import argparse
import json
import os
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
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python audit_alt_attributes.py <url>"}))
        sys.exit(1)
    
    url = sys.argv[1]
    
    try:
        import requests
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        html_content = response.text
    except ImportError:
        print(json.dumps({"error": "The 'requests' library is required. Please install it."}))
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(json.dumps({"error": f"Failed to fetch URL: {e}"}))
        sys.exit(1)

    issues = audit_alt_attributes(html_content, url)
    
    if issues:
        print(json.dumps(issues, indent=2))
    else:
        print(json.dumps({"message": "No issues found."}))

if __name__ == "__main__":
    import sys
    main()
