import argparse
import json
import requests
from bs4 import BeautifulSoup

def audit_alt_attributes(html_content):
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
                "element": str(img_tag),
                "src": img_tag.get('src', 'N/A')
            })
    return issues

def main():
    parser = argparse.ArgumentParser(description="Audit a given URL for missing or empty alt attributes.")
    parser.add_argument("url", help="The URL to audit.")
    args = parser.parse_args()

    try:
        response = requests.get(args.url)
        response.raise_for_status()  # Raise an HTTPError for bad responses (4xx or 5xx)
        html_content = response.text
        
        issues = audit_alt_attributes(html_content)
        
        print(json.dumps(issues, indent=2))

    except requests.exceptions.RequestException as e:
        print(json.dumps({"error": f"Failed to fetch URL {args.url}: {e}"}, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {e}"}, indent=2))

if __name__ == "__main__":
    main()
