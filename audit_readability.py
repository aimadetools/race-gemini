#!/usr/bin/env python3

import sys
import json
from bs4 import BeautifulSoup
import textstat

def audit_readability(html_content, filepath="N/A"):
    results = {
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
                    "description": f"Could not extract sufficient readable text from {filepath} for readability audit."
                })
        else:
            results["issues"].append({
                "type": "No Main Content Container Found",
                "description": f"Could not find a main content container (e.g., <div class='blog-content'> or <article>) in {filepath} to audit readability."
            })
        
    except Exception as e:
        results["issues"].append({
            "type": "Processing Error",
            "description": f"An unexpected error occurred while processing {filepath}: {e}"
        })
    
    return json.dumps(results)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python audit_readability.py <filepath>"}))
        sys.exit(1)
    
    filepath = sys.argv[1]
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            html_content = f.read()
        print(audit_readability(html_content, filepath))
    except FileNotFoundError:
        print(json.dumps({"error": f"File not found: {filepath}"}))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred while reading {filepath}: {e}"}))
