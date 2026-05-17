import json
import requests
import os


def _run_mobile_friendliness_audit(url, source_identifier="N/A"):
    """
    Audits the mobile-friendliness of a given URL using the Google PageSpeed Insights API.

    Args:
        url (str): The URL to audit.
        source_identifier (str): Identifier for the source.

    Returns:
        dict: A dictionary containing the mobile-friendliness score and any issues found.
    """
    results = {
        "is_mobile_friendly": False,
        "score": 0,
        "url_audited": url,
        "details": {},
    }
    issues = []

    api_key = os.environ.get("GOOGLE_PAGE_SPEED_API_KEY")
    if not api_key:
        issues.append(
            {
                "type": "API_KEY_MISSING",
                "message": "GOOGLE_PAGE_SPEED_API_KEY environment variable is not set. Cannot perform mobile-friendliness audit.",
                "source": source_identifier,
            }
        )
        return {
            "audit_type": "mobile_friendliness",
            "results": results,
            "issues": issues,
        }

    endpoint = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
    params = {
        "url": url,
        "key": api_key,
        "strategy": "mobile",
        "category": "accessibility",  # Mobile usability is often tied to accessibility/best practices
    }

    try:
        response = requests.get(endpoint, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        lighthouse_result = data.get("lighthouseResult", {})
        audits = lighthouse_result.get("audits", {})

        # Check for viewport meta tag
        viewport_audit = audits.get("viewport")
        if viewport_audit and viewport_audit.get("score") == 1:
            results["details"]["has_viewport"] = True
        else:
            results["details"]["has_viewport"] = False
            issues.append(
                {
                    "type": "MOBILE_FRIENDLINESS_ISSUE",
                    "message": "Page does not have a viewport meta tag with width=device-width or initial-scale=1. This is critical for mobile responsiveness.",
                    "source": source_identifier,
                }
            )

        # Check for tap targets
        tap_targets_audit = audits.get("tap-targets")
        if tap_targets_audit and tap_targets_audit.get("score") == 1:
            results["details"]["tap_targets_sufficient"] = True
        else:
            results["details"]["tap_targets_sufficient"] = False
            issues.append(
                {
                    "type": "MOBILE_FRIENDLINESS_ISSUE",
                    "message": "Tap targets are not sized appropriately or are too close together, making them difficult to tap on mobile devices.",
                    "source": source_identifier,
                }
            )

        # Check for font sizes
        font_size_audit = audits.get("font-size")
        if font_size_audit and font_size_audit.get("score") == 1:
            results["details"]["legible_font_sizes"] = True
        else:
            results["details"]["legible_font_sizes"] = False
            issues.append(
                {
                    "type": "MOBILE_FRIENDLINESS_ISSUE",
                    "message": "Font sizes are too small to be legible on mobile devices.",
                    "source": source_identifier,
                }
            )

        # Calculate a simple mobile-friendliness score based on audits
        mobile_friendly_audits_passed = 0
        if results["details"].get("has_viewport"):
            mobile_friendly_audits_passed += 1
        if results["details"].get("tap_targets_sufficient"):
            mobile_friendly_audits_passed += 1
        if results["details"].get("legible_font_sizes"):
            mobile_friendly_audits_passed += 1

        if mobile_friendly_audits_passed == 3:
            results["is_mobile_friendly"] = True
            results["score"] = 100
        elif mobile_friendly_audits_passed == 0:
            results["is_mobile_friendly"] = False
            results["score"] = 0
        else:
            results["is_mobile_friendly"] = False
            results["score"] = int((mobile_friendly_audits_passed / 3) * 100)

        # Add more detailed Lighthouse audit issues if available and relevant
        for audit_key, audit_value in audits.items():
            if (
                audit_key
                in [
                    "viewport",
                    "tap-targets",
                    "font-size",
                    "document-title",
                    "html-has-lang",
                    "hreflang",
                    "robots-txt",
                ]
                and audit_value.get("score") != 1
            ):
                display_value = audit_value.get("displayValue", audit_key)
                if audit_value.get("score") == 0:
                    issues.append(
                        {
                            "type": "LIGHTHOUSE_AUDIT_FAIL",
                            "message": f"Lighthouse audit '{display_value}' failed: {audit_value.get('errorMessage', 'No specific error message provided.')}",
                            "source": source_identifier,
                        }
                    )

    except requests.exceptions.RequestException as e:
        issues.append(
            {
                "type": "NETWORK_ERROR",
                "message": f"Failed to fetch PageSpeed Insights data for {url}: {e}",
                "source": source_identifier,
            }
        )
    except json.JSONDecodeError:
        issues.append(
            {
                "type": "API_ERROR",
                "message": f"Failed to decode JSON response from PageSpeed Insights API for {url}.",
                "source": source_identifier,
            }
        )
    except Exception as e:
        issues.append(
            {
                "type": "PROCESSING_ERROR",
                "message": f"An unexpected error occurred during mobile-friendliness audit for {url}: {e}",
                "source": source_identifier,
            }
        )

    return {"audit_type": "mobile_friendliness", "results": results, "issues": issues}


def audit(target_content, target_type="html_content", **kwargs):
    """
    Performs mobile-friendliness audit on the given target content (URL).

    Args:
        target_content: The URL to audit (required for this audit type).
        target_type (str): Specifies the type of target_content ('url' is expected).
        **kwargs: Additional options.

    Returns:
        dict: Standardized audit results including 'audit_type', 'results', and 'issues'.
    """
    issues = []
    url = target_content
    source_identifier = kwargs.get("source_identifier", url)

    if target_type != "url":
        issues.append(
            {
                "type": "ERROR",
                "message": f"Unsupported target_type '{target_type}' for mobile-friendliness audit. Only 'url' is supported.",
                "source": source_identifier,
            }
        )
        return {"audit_type": "mobile_friendliness", "results": {}, "issues": issues}

    return _run_mobile_friendliness_audit(url, source_identifier)
