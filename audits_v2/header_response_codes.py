import requests


def audit(target_url):
    """
    Performs an audit for HTTP header response codes on the given target URL.

    Args:
        target_url (str): The URL of the page to audit.

    Returns:
        dict: Standardized audit results including 'audit_type' and a list of 'issues'.
    """
    issues = []
    audit_type = "header_response_codes"

    try:
        response = requests.head(target_url, allow_redirects=True, timeout=10)
        status_code = response.status_code
        final_url = response.url  # The URL after all redirects

        if status_code == 200:
            issues.append(
                {
                    "type": "Success",
                    "description": f"Page returns a 200 OK status code.",
                    "url": target_url,
                    "status_code": status_code,
                }
            )
        elif 300 <= status_code < 400:
            issues.append(
                {
                    "type": "Redirect",
                    "description": f"Page returns a {status_code} redirect. Final URL: {final_url}",
                    "url": target_url,
                    "status_code": status_code,
                    "final_url": final_url,
                }
            )
        elif status_code == 404:
            issues.append(
                {
                    "type": "404 Not Found",
                    "description": f"Page returns a 404 Not Found status code. This indicates a broken link or removed content.",
                    "url": target_url,
                    "status_code": status_code,
                }
            )
        elif status_code >= 400:
            issues.append(
                {
                    "type": "Client Error",
                    "description": f"Page returns a {status_code} client error. This needs investigation. Reason: {response.reason}",
                    "url": target_url,
                    "status_code": status_code,
                }
            )
        elif status_code >= 500:
            issues.append(
                {
                    "type": "Server Error",
                    "description": f"Page returns a {status_code} server error. This needs immediate attention. Reason: {response.reason}",
                    "url": target_url,
                    "status_code": status_code,
                }
            )

    except requests.exceptions.RequestException as e:
        issues.append(
            {
                "type": "Network Error",
                "description": f"Failed to fetch URL {target_url}: {e}",
                "url": target_url,
            }
        )
    except Exception as e:
        issues.append(
            {
                "type": "Processing Error",
                "description": f"An unexpected error occurred during header response codes audit for {target_url}: {e}",
                "url": target_url,
            }
        )

    return {"audit_type": audit_type, "issues": issues}
