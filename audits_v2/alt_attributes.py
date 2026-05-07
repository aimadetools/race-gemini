
import requests
from bs4 import BeautifulSoup
import os

def audit(target_content, target_type='html_content', **kwargs):
    """
    Performs alt attribute audit on the given target content.

    Args:
        target_content: The content to audit. Can be an HTML string, a file path, or a URL.
        target_type (str): Specifies the type of target_content ('html_content', 'file_path', or 'url').
        **kwargs: Additional options. 'file_path' can be passed for context if target_type is 'html_content'.

    Returns:
        dict: Standardized audit results including 'audit_type' and a list of 'issues'.
    """
    issues = []
    html_content = ""
    source_identifier = kwargs.get('file_path', 'N/A') # Default source identifier

    try:
        if target_type == 'html_content':
            html_content = target_content
        elif target_type == 'file_path':
            source_identifier = target_content
            with open(target_content, 'r', encoding='utf-8') as f:
                html_content = f.read()
        elif target_type == 'url':
            source_identifier = target_content
            response = requests.get(target_content, timeout=10)
            response.raise_for_status()
            html_content = response.text
        else:
            issues.append({
                "type": "Invalid Target Type",
                "description": f"Unsupported target_type: {target_type}",
                "source": source_identifier
            })
            return {"audit_type": "alt_attributes", "issues": issues}

        if not html_content:
            issues.append({
                "type": "No Content to Audit",
                "description": "No HTML content provided or fetched for audit.",
                "source": source_identifier
            })
            return {"audit_type": "alt_attributes", "issues": issues}

        soup = BeautifulSoup(html_content, 'html.parser')
        for img_tag in soup.find_all('img'):
            if not img_tag.has_attr('alt') or not img_tag['alt'].strip():
                issues.append({
                    "type": "Missing or Empty Alt Attribute",
                    "source": source_identifier,
                    "element": str(img_tag),
                    "src": img_tag.get('src', 'N/A')
                })
    except requests.exceptions.RequestException as e:
        issues.append({
            "type": "Network Error",
            "description": f"Failed to fetch URL {source_identifier}: {e}",
            "source": source_identifier
        })
    except IOError as e:
        issues.append({
            "type": "File Error",
            "description": f"Failed to read file {source_identifier}: {e}",
            "source": source_identifier
        })
    except Exception as e:
        issues.append({
            "type": "Processing Error",
            "description": f"An unexpected error occurred while processing {source_identifier}: {e}",
            "source": source_identifier
        })
    
    return {"audit_type": "alt_attributes", "issues": issues}
