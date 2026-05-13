import requests
from xml.etree import ElementTree as ET

def audit(target_url):
    """
    Performs an audit for sitemap.xml presence and basic validity on the given target URL.

    Args:
        target_url (str): The base URL of the website to audit (e.g., "https://www.example.com").

    Returns:
        dict: Standardized audit results including 'audit_type' and a list of 'issues'.
    """
    issues = []
    audit_type = "sitemap_xml"
    sitemap_url = f"{target_url.rstrip('/')}/sitemap.xml"

    try:
        response = requests.get(sitemap_url, timeout=10)
        response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)

        content = response.text.strip()

        if not content:
            issues.append({
                "type": "Empty Sitemap.xml",
                "description": f"The sitemap.xml file at {sitemap_url} is empty.",
                "url": sitemap_url
            })
        else:
            # Basic XML parsing to check for well-formedness and expected tags
            try:
                # ET.fromstring handles XML declaration, so no need for explicit encoding
                root = ET.fromstring(content)
                # Check for common sitemap root elements
                if not (root.tag.endswith('urlset') or root.tag.endswith('sitemapindex')):
                    issues.append({
                        "type": "Invalid Sitemap Root Element",
                        "description": f"The sitemap.xml at {sitemap_url} has an unexpected root element: '{root.tag}'. Expected 'urlset' or 'sitemapindex'.",
                        "url": sitemap_url
                    })
            except ET.ParseError as e:
                issues.append({
                    "type": "Malformed Sitemap XML",
                    "description": f"The sitemap.xml file at {sitemap_url} is malformed XML: {e}",
                    "url": sitemap_url
                })

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            issues.append({
                "type": "Sitemap.xml Not Found",
                "description": f"No sitemap.xml file found at {sitemap_url}. This might impact search engine crawling and indexing.",
                "url": sitemap_url
            })
        else:
            issues.append({
                "type": "HTTP Error Fetching Sitemap.xml",
                "description": f"Failed to fetch sitemap.xml from {sitemap_url}: HTTP Status {e.response.status_code} - {e.response.reason}",
                "url": sitemap_url
            })
    except requests.exceptions.ConnectionError as e:
        issues.append({
            "type": "Connection Error Fetching Sitemap.xml",
            "description": f"Could not connect to {sitemap_url} to fetch sitemap.xml. This might indicate a network issue or the domain is unreachable.",
            "url": sitemap_url
        })
    except requests.exceptions.Timeout as e:
        issues.append({
            "type": "Timeout Fetching Sitemap.xml",
            "description": f"Request to {sitemap_url} timed out while fetching sitemap.xml.",
            "url": sitemap_url
        })
    except Exception as e:
        issues.append({
            "type": "Processing Error",
            "description": f"An unexpected error occurred during sitemap.xml audit for {target_url}: {e}",
            "url": target_url
        })
    
    return {"audit_type": audit_type, "issues": issues}
