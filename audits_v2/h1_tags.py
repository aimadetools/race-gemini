import requests
from bs4 import BeautifulSoup
import os

def audit(target_content, target_type='html_content', **kwargs):
    """
    Performs H1 tag audit on the given target content.

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
            return {"audit_type": "h1_tags", "issues": issues}

        if not html_content:
            issues.append({
                "type": "No Content to Audit",
                "description": "No HTML content provided or fetched for audit.",
                "source": source_identifier
            })
            return {"audit_type": "h1_tags", "issues": issues}

        soup = BeautifulSoup(html_content, 'html.parser')
        h1_tags = soup.find_all('h1')

        H1_MIN_LENGTH = 10
        H1_MAX_LENGTH = 70

        if len(h1_tags) > 1:
            issues.append({
                "type": "Multiple H1 Tags",
                "description": f"Found {len(h1_tags)} H1 tags. It is generally recommended to have only one H1 tag per page for SEO.",
                "source": source_identifier,
                "h1_content": [h1.get_text(strip=True) for h1 in h1_tags],
                "h1_html": [str(h1) for h1 in h1_tags]
            })
        elif len(h1_tags) == 0:
            issues.append({
                "type": "No H1 Tag Found",
                "description": "No H1 tag found. An H1 tag is crucial for SEO to signal the main heading of the page.",
                "source": source_identifier
            })
        else: # Exactly one H1 tag found
            h1_tag = h1_tags[0]
            h1_text = h1_tag.get_text(strip=True)
            h1_length = len(h1_text)

            if h1_length < H1_MIN_LENGTH:
                issues.append({
                    "type": "H1 Tag Too Short",
                    "description": f"H1 tag is too short ({h1_length} characters). It should be between {H1_MIN_LENGTH} and {H1_MAX_LENGTH} characters for optimal SEO.",
                    "source": source_identifier,
                    "h1_content": h1_text,
                    "h1_html": str(h1_tag)
                })
            elif h1_length > H1_MAX_LENGTH:
                issues.append({
                    "type": "H1 Tag Too Long",
                    "description": f"H1 tag is too long ({h1_length} characters). It should be between {H1_MIN_LENGTH} and {H1_MAX_LENGTH} characters for optimal SEO.",
                    "source": source_identifier,
                    "h1_content": h1_text,
                    "h1_html": str(h1_tag)
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
    
    return {"audit_type": "h1_tags", "issues": issues}
