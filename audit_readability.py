#!/usr/bin/env python3

import sys
import json
import requests # Moved here
from bs4 import BeautifulSoup
import textstat
import argparse

def audit_readability(html_content, target="N/A"):
    results = {
        "target": target,
        "flesch_reading_ease": None,
        "flesch_kincaid_grade": None,
        "issues": []
    }
    
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extract main text content. We'll look for common content containers.
        # This is a heuristic and might need refinement based on actual blog post structure.
        main_content_div = soup.find('div', class_='blog-content') or \
                           soup.find('article') or \
                           soup.find('body')
        
        if main_content_div:
            # Get all text, excluding script and style tags
            for script_or_style in main_content_div(["script", "style"]):
                script_or_style.extract()
            text = main_content_div.get_text(separator=' ', strip=True)
            
            if text:
                results["flesch_reading_ease"] = textstat.flesch_reading_ease(text)
                results["flesch_kincaid_grade"] = textstat.flesch_kincaid_grade(text)
            else:
                results["issues"].append({
                    "type": "No Readable Text Found",
                    "description": f"Could not extract sufficient readable text from {target} for readability audit."
                })
        else:
            results["issues"].append({
                "type": "No Main Content Container Found",
                "description": f"Could not find a main content container (e.g., <div class='blog-content'> or <article>) in {target} to audit readability."
            })
        
    except Exception as e:
        results["issues"].append({
            "type": "Processing Error",
            "description": f"An unexpected error occurred while processing {target}: {e}"
        })
    
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Audit readability (Flesch-Kincaid) of an HTML file or URL.')
    parser.add_argument('target', type=str, help='Path to an HTML file or a URL to audit.')
    args = parser.parse_args()
    
    html_content = ""
    
    # Check if the target is a URL
    if args.target.startswith('http://') or args.target.startswith('https://'):
        try:
            response = requests.get(args.target, timeout=10)
            response.raise_for_status()
            html_content = response.text
        except requests.exceptions.RequestException as e:
            print(json.dumps({"error": f"Failed to fetch URL: {e}"}, indent=2))
            sys.exit(1)
    else:
        # Assume it's a local file path
        try:
            with open(args.target, 'r', encoding='utf-8') as f:
                html_content = f.read()
        except FileNotFoundError:
            print(json.dumps({"error": f"File not found: {args.target}"}, indent=2))
            sys.exit(1)
        except Exception as e:
            print(json.dumps({"error": f"An unexpected error occurred while reading {args.target}: {e}"}, indent=2))
            sys.exit(1)

    result = audit_readability(html_content, args.target)
    print(json.dumps(result, indent=2))
