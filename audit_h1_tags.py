#!/usr/bin/env python3

import sys
import json
from bs4 import BeautifulSoup

def audit_h1_tags(html_content, filepath="N/A"):
    results = {
        "num_h1_tags": 0,
        "issues": [],
        "h1_content": []
    }
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        h1_tags = soup.find_all('h1')
        results["num_h1_tags"] = len(h1_tags)
        results["h1_content"] = [h1.get_text(strip=True) for h1 in h1_tags]

        if len(h1_tags) > 1:
            results["issues"].append({
                "type": "Multiple H1 Tags",
                "description": f"Found {len(h1_tags)} H1 tags in {filepath}. It is generally recommended to have only one H1 tag per page for SEO."
            })
        elif len(h1_tags) == 0:
            results["issues"].append({
                "type": "No H1 Tag Found",
                "description": f"No H1 tag found in {filepath}. An H1 tag is crucial for SEO to signal the main heading of the page."
            })
        # No else needed, as optimal case doesn't need an issue reported, only num_h1_tags and h1_content will be present
        
    except Exception as e:
        results["issues"].append({
            "type": "Processing Error",
            "description": f"An unexpected error occurred while processing {filepath}: {e}"
        })
    
    return json.dumps(results)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python audit_h1_tags.py <filepath_or_url>"}))
        sys.exit(1)
    
    target = sys.argv[1]
    html_content = ""
    
    # Check if the target is a URL
    if target.startswith('http://') or target.startswith('https://'):
        try:
            import requests
            response = requests.get(target, timeout=10)
            response.raise_for_status()
            html_content = response.text
        except requests.exceptions.RequestException as e:
            print(json.dumps({"error": f"Failed to fetch URL: {e}"}))
            sys.exit(1)
        except ImportError:
            print(json.dumps({"error": "The 'requests' library is required to fetch URLs. Please install it by running 'pip install requests'"}))
            sys.exit(1)
    else:
        # Assume it's a local file path
        try:
            with open(target, 'r', encoding='utf-8') as f:
                html_content = f.read()
        except FileNotFoundError:
            print(json.dumps({"error": f"File not found: {target}"}))
            sys.exit(1)
        except Exception as e:
            print(json.dumps({"error": f"An unexpected error occurred while reading {target}: {e}"}))
            sys.exit(1)

    print(audit_h1_tags(html_content, target))
