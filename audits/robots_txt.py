import requests
import json
import sys


def audit_robots_txt(url):
    """
    Checks for the presence and basic validity of a robots.txt file.
    """
    robots_url = url.rstrip("/") + "/robots.txt"
    issues = []
    try:
        response = requests.get(robots_url, timeout=10)
        if response.status_code == 200:
            # Check if the file is empty
            if not response.text.strip():
                issues.append(
                    {"type": "warning", "description": "The robots.txt file is empty."}
                )
            # Check for common directives
            if "User-agent:" not in response.text:
                issues.append(
                    {
                        "type": "warning",
                        "description": "The robots.txt file does not contain a 'User-agent:' directive.",
                    }
                )
        elif response.status_code == 404:
            issues.append(
                {
                    "type": "error",
                    "description": "The robots.txt file is missing (404 Not Found).",
                }
            )
        else:
            issues.append(
                {
                    "type": "error",
                    "description": f"The robots.txt file returned an unexpected status code: {response.status_code}.",
                }
            )
    except requests.exceptions.RequestException as e:
        issues.append(
            {"type": "error", "description": f"Could not fetch robots.txt: {e}"}
        )

    print(json.dumps({"issues": issues}))


if __name__ == "__main__":
    if len(sys.argv) > 1:
        audit_robots_txt(sys.argv[1])
    else:
        print(json.dumps({"error": "URL is required."}))
