import json
import time
import requests
import statistics


def _run_page_load_time_audit(url, source_identifier="N/A", timeout=10, samples=1):
    """
    Audits the page load time of a given URL.

    Args:
        url (str): The URL to audit.
        source_identifier (str): Identifier for the source.
        timeout (int): Timeout for the HTTP request in seconds.
        samples (int): Number of times to measure the load time.

    Returns:
        dict: A dictionary containing the page load times, average, stdev, and status code.
    """
    load_times = []
    status_code = None
    issues = []

    for i in range(samples):
        try:
            start_time = time.time()
            response = requests.get(url, timeout=timeout)
            end_time = time.time()
            load_time = end_time - start_time
            load_times.append(load_time)
            status_code = response.status_code
            response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
        except requests.exceptions.Timeout:
            issues.append(
                {
                    "type": "ERROR",
                    "message": f"Sample {i+1}: Request timed out after {timeout} seconds.",
                    "source": source_identifier,
                }
            )
            break  # No need to try further samples if it times out consistently
        except requests.exceptions.ConnectionError:
            issues.append(
                {
                    "type": "ERROR",
                    "message": f"Sample {i+1}: Failed to connect to the server.",
                    "source": source_identifier,
                }
            )
            break
        except requests.exceptions.HTTPError as e:
            issues.append(
                {
                    "type": "ERROR",
                    "message": f"Sample {i+1}: HTTP error occurred: {e.response.status_code} - {e.response.reason}",
                    "source": source_identifier,
                }
            )
            break
        except requests.exceptions.RequestException as e:
            issues.append(
                {
                    "type": "ERROR",
                    "message": f"Sample {i+1}: A general request error occurred: {e}",
                    "source": source_identifier,
                }
            )
            break
        except Exception as e:
            issues.append(
                {
                    "type": "ERROR",
                    "message": f"Sample {i+1}: An unexpected error occurred: {e}",
                    "source": source_identifier,
                }
            )
            break

    results = {}
    if issues:
        # If there are errors, report them and whatever status code was last seen
        return {
            "audit_type": "page_load_times",
            "results": {
                "url_audited": url,
                "status_code": status_code,
            },
            "issues": issues,
        }
    elif (
        not load_times
    ):  # Should not happen if no issues and samples > 0, but for safety
        issues.append(
            {
                "type": "ERROR",
                "message": "No load times recorded despite no explicit errors.",
                "source": source_identifier,
            }
        )
        return {
            "audit_type": "page_load_times",
            "results": {
                "url_audited": url,
                "status_code": status_code,
            },
            "issues": issues,
        }
    else:
        avg_load_time = statistics.mean(load_times)
        stdev_load_time = statistics.stdev(load_times) if len(load_times) > 1 else 0.0
        results = {
            "url_audited": url,
            "samples": len(load_times),
            "load_times_raw": [f"{t:.2f}s" for t in load_times],
            "average_load_time": f"{avg_load_time:.2f}s",
            "stdev_load_time": f"{stdev_load_time:.2f}s",
            "status_code": status_code,
        }
        return {"audit_type": "page_load_times", "results": results, "issues": issues}


def audit(target_content, target_type="html_content", **kwargs):
    """
    Performs page load time audit on the given target content (URL).

    Args:
        target_content: The URL to audit (required for this audit type).
        target_type (str): Specifies the type of target_content ('url' is expected).
        **kwargs: Additional options.
                  'timeout' (int): Timeout for the HTTP request in seconds (default: 10).
                  'samples' (int): Number of times to measure the load time (default: 1).

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
                "message": f"Unsupported target_type '{target_type}' for page load time audit. Only 'url' is supported.",
                "source": source_identifier,
            }
        )
        return {"audit_type": "page_load_times", "results": {}, "issues": issues}

    timeout = kwargs.get("timeout", 10)
    samples = kwargs.get("samples", 1)

    return _run_page_load_time_audit(url, source_identifier, timeout, samples)
