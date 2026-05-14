import requests
from bs4 import BeautifulSoup
import os
from .utils import fetch_content # Import the utility function

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
    source_identifier = kwargs.get('file_path', 'N/A') # Default source identifier

    # Use the utility function to fetch content
    html_content, fetch_issues = fetch_content(target_content, target_type, source_identifier)
    issues.extend(fetch_issues)

    if fetch_issues:
        return {"audit_type": "alt_attributes", "issues": issues}

    # Original alt attribute audit logic
    soup = BeautifulSoup(html_content, 'html.parser')
    for img_tag in soup.find_all('img'):
        if not img_tag.has_attr('alt') or not img_tag['alt'].strip():
            issues.append({
                "type": "Missing or Empty Alt Attribute",
                "source": source_identifier,
                "element": str(img_tag),
                "src": img_tag.get('src', 'N/A')
            })
    
    return {"audit_type": "alt_attributes", "issues": issues}
