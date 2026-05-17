import requests
import os


def fetch_content(target_content, target_type, source_identifier, timeout=10):
    """
    Fetches content based on target_type and returns HTML content and potential issues.

    Args:
        target_content: The content source (HTML string, file path, or URL).
        target_type (str): Type of the target_content ('html_content', 'file_path', or 'url').
        source_identifier (str): Identifier for logging/reporting (e.g., file_path or URL).
        timeout (int): Timeout for network requests in seconds.

    Returns:
        tuple: (html_content, issues_list) where issues_list is a list of dictionaries
               if errors occurred, otherwise an empty list.
    """
    html_content = ""
    issues = []

    try:
        if target_type == "html_content":
            html_content = target_content
        elif target_type == "file_path":
            with open(target_content, "r", encoding="utf-8") as f:
                html_content = f.read()
        elif target_type == "url":
            response = requests.get(target_content, timeout=timeout)
            response.raise_for_status()
            html_content = response.text
        else:
            issues.append(
                {
                    "type": "Invalid Target Type",
                    "description": f"Unsupported target_type: {target_type}",
                    "source": source_identifier,
                }
            )
            return "", issues

        if not html_content:
            issues.append(
                {
                    "type": "No Content to Audit",
                    "description": "No HTML content provided or fetched for audit.",
                    "source": source_identifier,
                }
            )
            return "", issues

    except requests.exceptions.RequestException as e:
        issues.append(
            {
                "type": "Network Error",
                "description": f"Failed to fetch URL {source_identifier}: {e}",
                "source": source_identifier,
            }
        )
    except IOError as e:
        issues.append(
            {
                "type": "File Error",
                "description": f"Failed to read file {source_identifier}: {e}",
                "source": source_identifier,
            }
        )
    except Exception as e:
        issues.append(
            {
                "type": "Processing Error",
                "description": f"An unexpected error occurred while processing {source_identifier}: {e}",
                "source": source_identifier,
            }
        )

    return html_content, issues
