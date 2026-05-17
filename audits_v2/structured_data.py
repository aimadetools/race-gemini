import json
from bs4 import BeautifulSoup


def _run_structured_data_audit(html_content, source_identifier="N/A"):
    """
    Audits the structured data (JSON-LD) from HTML content.
    """
    structured_data = []
    issues = []

    try:
        soup = BeautifulSoup(html_content, "html.parser")
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                structured_data.append(data)
            except json.JSONDecodeError as e:
                issues.append(
                    {
                        "type": "ERROR",
                        "message": f"Invalid JSON-LD found: {e}",
                        "source": source_identifier,
                        "element": str(script),
                    }
                )
    except Exception as e:
        issues.append(
            {
                "type": "ERROR",
                "message": f"An unexpected error occurred during structured data parsing: {e}",
                "source": source_identifier,
            }
        )

    results = {"structured_data_found": structured_data}

    if not structured_data and not issues:
        issues.append(
            {
                "type": "INFO",
                "message": "No structured data (JSON-LD) found.",
                "source": source_identifier,
            }
        )

    return {"audit_type": "structured_data", "results": results, "issues": issues}


def audit(target_content, target_type="html_content", **kwargs):
    """
    Performs structured data audit on the given target content.

    Args:
        target_content: The content to audit. Can be an HTML string, a file path, or a URL.
        target_type (str): Specifies the type of target_content ('html_content', 'file_path', or 'url').
        **kwargs: Additional options.

    Returns:
        dict: Standardized audit results including 'audit_type', 'results', and 'issues'.
    """
    import requests  # Imported here as it's only needed for URL fetching

    html_content = ""
    source_identifier = kwargs.get("source_identifier", "N/A")

    try:
        if target_type == "html_content":
            html_content = target_content
        elif target_type == "file_path":
            source_identifier = target_content
            with open(target_content, "r", encoding="utf-8") as f:
                html_content = f.read()
        elif target_type == "url":
            source_identifier = target_content
            response = requests.get(target_content, timeout=10)
            response.raise_for_status()
            html_content = response.text
        else:
            return {
                "audit_type": "structured_data",
                "issues": [
                    {
                        "type": "ERROR",
                        "message": f"Unsupported target_type: {target_type}",
                        "source": source_identifier,
                    }
                ],
            }

        if not html_content:
            return {
                "audit_type": "structured_data",
                "issues": [
                    {
                        "type": "ERROR",
                        "message": "No HTML content provided or fetched for audit.",
                        "source": source_identifier,
                    }
                ],
            }

        return _run_structured_data_audit(html_content, source_identifier)

    except requests.exceptions.RequestException as e:
        return {
            "audit_type": "structured_data",
            "issues": [
                {
                    "type": "ERROR",
                    "message": f"Failed to fetch URL {source_identifier}: {e}",
                    "source": source_identifier,
                }
            ],
        }
    except IOError as e:
        return {
            "audit_type": "structured_data",
            "issues": [
                {
                    "type": "ERROR",
                    "message": f"Failed to read file {source_identifier}: {e}",
                    "source": source_identifier,
                }
            ],
        }
    except Exception as e:
        return {
            "audit_type": "structured_data",
            "issues": [
                {
                    "type": "ERROR",
                    "message": f"An unexpected error occurred during content acquisition: {e}",
                    "source": source_identifier,
                }
            ],
        }
