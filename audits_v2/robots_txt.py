import requests
import re


def audit(target_url):
    """
    Performs a robots.txt audit on the given target URL.

    Args:
        target_url (str): The base URL of the website to audit (e.g., "https://www.example.com").

    Returns:
        dict: Standardized audit results including 'audit_type' and a list of 'issues'.
    """
    issues = []
    robots_url = f"{target_url.rstrip('/')}/robots.txt"
    audit_type = "robots_txt"

    try:
        response = requests.get(robots_url, timeout=10)
        response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)

        content = response.text.strip()

        if not content:
            issues.append(
                {
                    "type": "Empty Robots.txt",
                    "description": f"The robots.txt file at {robots_url} is empty.",
                    "url": robots_url,
                }
            )

        # Check for presence of User-agent directive
        if not re.search(r"User-agent:", content, re.IGNORECASE):
            issues.append(
                {
                    "type": "Missing User-agent Directive",
                    "description": f"The robots.txt file at {robots_url} does not contain any 'User-agent' directives, which are essential for directing crawlers.",
                    "url": robots_url,
                }
            )

        # Check for disallowed content not followed by an allow (common misconfiguration)
        # This is a basic check and can be expanded.
        if re.search(r"Disallow:\s*(/\S*)\s*Allow:", content, re.IGNORECASE):
            issues.append(
                {
                    "type": "Conflicting Disallow/Allow Directives",
                    "description": f"The robots.txt file at {robots_url} contains 'Disallow' followed by 'Allow' on the same line or in a way that might be confusing for crawlers. Review for potential conflicts.",
                    "url": robots_url,
                }
            )

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            issues.append(
                {
                    "type": "Robots.txt Not Found",
                    "description": f"No robots.txt file found at {robots_url}. This might impact search engine crawling and indexing.",
                    "url": robots_url,
                }
            )
        else:
            issues.append(
                {
                    "type": "HTTP Error Fetching Robots.txt",
                    "description": f"Failed to fetch robots.txt from {robots_url}: HTTP Status {e.response.status_code} - {e.response.reason}",
                    "url": robots_url,
                }
            )
    except requests.exceptions.ConnectionError as e:
        issues.append(
            {
                "type": "Connection Error Fetching Robots.txt",
                "description": f"Could not connect to {robots_url} to fetch robots.txt. This might indicate a network issue or the domain is unreachable.",
                "url": robots_url,
            }
        )
    except requests.exceptions.Timeout as e:
        issues.append(
            {
                "type": "Timeout Fetching Robots.txt",
                "description": f"Request to {robots_url} timed out while fetching robots.txt.",
                "url": robots_url,
            }
        )
    except Exception as e:
        issues.append(
            {
                "type": "Processing Error",
                "description": f"An unexpected error occurred during robots.txt audit for {target_url}: {e}",
                "url": robots_url,
            }
        )

    return {"audit_type": audit_type, "issues": issues}
