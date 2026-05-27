import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import os
from .utils import fetch_content  # Import the utility function


def audit(target_content, target_type="html_content", timeout=10, **kwargs):
    """
    Performs broken link audit on the given target content.

    Args:
        target_content: The content to audit. Can be an HTML string, a file path, or a URL.
        target_type (str): Specifies the type of target_content ('html_content', 'file_path', or 'url').
        timeout (int): The timeout for the link checking in seconds.
        **kwargs: Additional options. 'file_path' can be passed for context if target_type is 'html_content'.

    Returns:
        dict: Standardized audit results including 'audit_type' and a list of 'issues'.
    """
    issues = []
    source_identifier = kwargs.get("file_path", "N/A")  # Default source identifier

    # Use the utility function to fetch content
    html_content, fetch_issues = fetch_content(
        target_content, target_type, source_identifier, timeout=timeout
    )
    issues.extend(fetch_issues)

    if fetch_issues:
        return {"audit_type": "broken_links", "issues": issues}

    # Original broken link audit logic
    links_to_check = set()
    soup = BeautifulSoup(html_content, "html.parser")
    for a_tag in soup.find_all("a", href=True):
        link = a_tag["href"]
        parsed_link = urlparse(link)
        # Only check external links
        if (
            parsed_link.scheme
            and parsed_link.netloc
            and parsed_link.netloc != urlparse(source_identifier).netloc
        ):
            links_to_check.add(link)
        # Handle scheme-less external links, assuming HTTP/HTTPS
        elif (
            not parsed_link.scheme
            and parsed_link.netloc
            and parsed_link.netloc != urlparse(source_identifier).netloc
        ):
            links_to_check.add(f"https://{link}")

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    )

    for link in links_to_check:
        try:
            check = session.head(link, allow_redirects=True, timeout=timeout)
            status_code = check.status_code
            if status_code in [403, 404, 405, 501]:
                try:
                    check_get = session.get(link, allow_redirects=True, timeout=timeout, stream=True)
                    status_code = check_get.status_code
                    check_get.close()
                except requests.exceptions.RequestException:
                    pass
            if 400 <= status_code < 600:
                is_social = any(domain in link for domain in ["facebook.com", "linkedin.com", "twitter.com", "instagram.com", "x.com"])
                if is_social:
                    import subprocess
                    try:
                        res = subprocess.run(
                            ["curl", "-o", "/dev/null", "-s", "-w", "%{http_code}", "-I", "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", link],
                            capture_output=True, text=True, timeout=5
                        )
                        curl_code = int(res.stdout.strip())
                        if 200 <= curl_code < 400:
                            status_code = curl_code
                    except Exception:
                        pass
            if 400 <= status_code < 600:
                issues.append(
                    {
                        "type": "Broken Link",
                        "description": f"Link returned status code {status_code}",
                        "source": source_identifier,
                        "link": link,
                        "status_code": status_code,
                    }
                )
        except requests.exceptions.RequestException as e:
            issues.append(
                {
                    "type": "Broken Link - Network Error",
                    "description": f"Failed to connect or timeout: {e}",
                    "source": source_identifier,
                    "link": link,
                }
            )

    return {"audit_type": "broken_links", "issues": issues}
