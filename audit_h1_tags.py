#!/usr/bin/env python3

import sys
import requests
from bs4 import BeautifulSoup
import json

def audit_h1_tags(url):
    results = {
        "num_h1_tags": 0,
        "issues": [],
        "h1_content": []
    }
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status() # Raise an exception for HTTP errors
        soup = BeautifulSoup(response.text, 'html.parser')
        
        h1_tags = soup.find_all('h1')
        results["num_h1_tags"] = len(h1_tags)
        results["h1_content"] = [h1.get_text(strip=True) for h1 in h1_tags]

        if len(h1_tags) > 1:
            results["issues"].append({
                "type": "Multiple H1 Tags",
                "description": f"Found {len(h1_tags)} H1 tags. It is generally recommended to have only one H1 tag per page for SEO."
            })
        elif len(h1_tags) == 0:
            results["issues"].append({
                "type": "No H1 Tag Found",
                "description": "No H1 tag found on the page. An H1 tag is crucial for SEO to signal the main heading of the page."
            })
        else:
            results["issues"].append({
                "type": "H1 Tag Present",
                "description": "Exactly one H1 tag found, which is optimal for SEO."
            })

    except requests.exceptions.RequestException as e:
        results["issues"].append({
            "type": "Network Error",
            "description": f"Could not access URL: {e}"
        })
    except Exception as e:
        results["issues"].append({
            "type": "Processing Error",
            "description": f"An unexpected error occurred: {e}"
        })
    
    return json.dumps(results)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python audit_h1_tags.py <url>"}))
        sys.exit(1)
    
    url = sys.argv[1]
    print(audit_h1_tags(url))
