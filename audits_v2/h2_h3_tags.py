import json
import requests
from bs4 import BeautifulSoup
import os

def audit(target, target_type):
    results = {
        "num_h2_tags": 0,
        "num_h3_tags": 0,
        "h2_content": [],
        "h3_content": [],
        "issues": []
    }
    filepath_or_url = target # Store for reporting in issues

    try:
        html_content = ""
        if target_type == 'url':
            response = requests.get(target, timeout=10)
            response.raise_for_status()
            html_content = response.text
        elif target_type == 'file_path':
            with open(target, 'r', encoding='utf-8') as f:
                html_content = f.read()
        else:
            raise ValueError(f"Unsupported target_type: {target_type}")

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
                    "description": f"Found an empty H2 tag in {filepath_or_url}. H2 tags should contain descriptive content. Tag HTML: {str(h2)}"
                })
        for h3 in h3_tags:
            if not h3.get_text(strip=True):
                results["issues"].append({
                    "type": "Empty H3 Tag",
                    "description": f"Found an empty H3 tag in {filepath_or_url}. H3 tags should contain descriptive content. Tag HTML: {str(h3)}"
                })

        # Check for H3 before H2 (improper hierarchy)
        found_h2 = False
        for tag in h_tags:
            if tag.name == 'h2':
                found_h2 = True
            elif tag.name == 'h3' and not found_h2:
                results["issues"].append({
                    "type": "H3 Before H2",
                    "description": f"Found an H3 tag before any H2 tag in {filepath_or_url}. Headings should follow a proper hierarchical structure (H1 -> H2 -> H3). Problematic H3: {str(tag)}"
                })
                break # Only report once per file

        # Check for absence of H2 or H3 tags
        if not h2_tags and not h3_tags:
            results["issues"].append({
                "type": "No H2 or H3 Tags Found",
                "description": f"No H2 or H3 heading tags were found in {filepath_or_url}. Consider adding H2 and H3 tags to improve content structure and readability."
            })
        elif not h2_tags:
            results["issues"].append({
                "type": "No H2 Tags Found",
                "description": f"No H2 heading tags were found in {filepath_or_url}. Consider adding H2 tags to improve content structure and readability."
            })
        elif not h3_tags:
            results["issues"].append({
                "type": "No H3 Tags Found",
                "description": f"No H3 heading tags were found in {filepath_or_url}. Consider adding H3 tags to improve content structure and readability."
            })

    except requests.exceptions.RequestException as e:
        results["issues"].append({
            "type": "Network Error",
            "description": f"Failed to fetch URL {filepath_or_url}: {e}"
        })
    except FileNotFoundError:
        results["issues"].append({
            "type": "File Error",
            "description": f"File not found: {filepath_or_url}"
        })
    except Exception as e:
        results["issues"].append({
            "type": "Processing Error",
            "description": f"An unexpected error occurred while processing {filepath_or_url}: {e}"
        })
    
    return results
