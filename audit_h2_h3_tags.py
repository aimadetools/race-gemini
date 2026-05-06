#!/usr/bin/env python3

import sys
import json
from bs4 import BeautifulSoup

def audit_h2_h3_tags(html_content, filepath="N/A"):
    results = {
        "num_h2_tags": 0,
        "num_h3_tags": 0,
        "h2_content": [],
        "h3_content": [],
        "issues": []
    }
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        h_tags = soup.find_all(['h1', 'h2', 'h3'])
        
        h2_tags = soup.find_all('h2')
        results["num_h2_tags"] = len(h2_tags)
        results["h2_content"] = [h2.get_text(strip=True) for h2 in h2_tags]

        h3_tags = soup.find_all('h3')
        results["num_h3_tags"] = len(h3_tags)
        results["h3_content"] = [h3.get_text(strip=True) for h3 in h3_tags]

        # Check for empty H2/H3 tags
        for h2 in h2_tags:
            if not h2.get_text(strip=True):
                results["issues"].append({
                    "type": "Empty H2 Tag",
                    "description": f"Found an empty H2 tag in {filepath}. H2 tags should contain descriptive content."
                })
        for h3 in h3_tags:
            if not h3.get_text(strip=True):
                results["issues"].append({
                    "type": "Empty H3 Tag",
                    "description": f"Found an empty H3 tag in {filepath}. H3 tags should contain descriptive content."
                })

        # Check for H3 before H2 (improper hierarchy)
        found_h2 = False
        for tag in h_tags:
            if tag.name == 'h2':
                found_h2 = True
            elif tag.name == 'h3' and not found_h2:
                results["issues"].append({
                    "type": "H3 Before H2",
                    "description": f"Found an H3 tag before any H2 tag in {filepath}. Headings should follow a proper hierarchical structure (H1 -> H2 -> H3)."
                })
                break # Only report once per file

    except Exception as e:
        results["issues"].append({
            "type": "Processing Error",
            "description": f"An unexpected error occurred while processing {filepath}: {e}"
        })
    
    return json.dumps(results)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python audit_h2_h3_tags.py <filepath_or_url>"}))
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

    print(audit_h2_h3_tags(html_content, target))
