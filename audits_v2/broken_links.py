import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import os

def audit(target_content, target_type='html_content', **kwargs):
    """
    Performs broken link audit on the given target content.

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
    links_to_check = set()

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
            return {"audit_type": "broken_links", "issues": issues}

        if not html_content:
            issues.append({
                "type": "No Content to Audit",
                "description": "No HTML content provided or fetched for audit.",
                "source": source_identifier
            })
            return {"audit_type": "broken_links", "issues": issues}

        soup = BeautifulSoup(html_content, 'html.parser')
        for a_tag in soup.find_all('a', href=True):
            link = a_tag['href']
            parsed_link = urlparse(link)
            # Only check external links
            if parsed_link.scheme and parsed_link.netloc and parsed_link.netloc != urlparse(source_identifier).netloc:
                links_to_check.add(link)
            # Handle scheme-less external links, assuming HTTP/HTTPS
            elif not parsed_link.scheme and parsed_link.netloc and parsed_link.netloc != urlparse(source_identifier).netloc:
                links_to_check.add(f"https://{link}")

        session = requests.Session()
        session.headers.update({'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'})
        
        for link in links_to_check:
            try:
                check = session.get(link, allow_redirects=True, timeout=10, stream=True)
                if 400 <= check.status_code < 600:
                    issues.append({
                        "type": "Broken Link",
                        "description": f"Link returned status code {check.status_code}",
                        "source": source_identifier,
                        "link": link,
                        "status_code": check.status_code
                    })
                check.close()
            except requests.exceptions.RequestException as e:
                issues.append({
                    "type": "Broken Link - Network Error",
                    "description": f"Failed to connect or timeout: {e}",
                    "source": source_identifier,
                    "link": link
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
    
    return {"audit_type": "broken_links", "issues": issues}
