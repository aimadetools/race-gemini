import requests
from bs4 import BeautifulSoup

def audit(target_url):
    """
    Performs an audit for canonical tags on the given target URL.

    Args:
        target_url (str): The URL of the page to audit.

    Returns:
        dict: Standardized audit results including 'audit_type' and a list of 'issues'.
    """
    issues = []
    audit_type = "canonical_tags"

    try:
        response = requests.get(target_url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        canonical_link = soup.find('link', rel='canonical')

        if not canonical_link:
            issues.append({
                "type": "Missing Canonical Tag",
                "description": f"The page {target_url} is missing a canonical tag. This can lead to duplicate content issues.",
                "url": target_url
            })
        else:
            canonical_href = canonical_link.get('href')
            if not canonical_href:
                issues.append({
                    "type": "Empty Canonical Tag Href",
                    "description": f"The canonical tag on {target_url} has an empty 'href' attribute.",
                    "url": target_url,
                    "element": str(canonical_link)
                })
            elif not (canonical_href.startswith('http://') or canonical_href.startswith('https://')):
                issues.append({
                    "type": "Relative Canonical URL",
                    "description": f"The canonical tag on {target_url} uses a relative URL ('{canonical_href}'). Canonical URLs should always be absolute.",
                    "url": target_url,
                    "element": str(canonical_link)
                })
            elif canonical_href != target_url:
                issues.append({
                    "type": "Canonical Tag Mismatch",
                    "description": f"The canonical tag's URL ('{canonical_href}') does not match the page's URL ('{target_url}'). This might be intentional, but can also indicate a misconfiguration.",
                    "url": target_url,
                    "canonical_url": canonical_href,
                    "page_url": target_url,
                    "element": str(canonical_link)
                })
            else:
                pass # Canonical tag is present and matches page URL, no issue

    except requests.exceptions.RequestException as e:
        issues.append({
            "type": "Network Error",
            "description": f"Failed to fetch URL {target_url}: {e}",
            "url": target_url
        })
    except Exception as e:
        issues.append({
            "type": "Processing Error",
            "description": f"An unexpected error occurred during canonical tag audit for {target_url}: {e}",
            "url": target_url
        })
    
    return {"audit_type": audit_type, "issues": issues}
