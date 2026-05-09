
import sys
import json
import time
import requests
import argparse # Import argparse
import statistics # Import statistics for average/stdev

def audit_page_load_time(url, timeout=10, samples=1):
    """
    Audits the page load time of a given URL.

    Args:
        url (str): The URL to audit.
        timeout (int): Timeout for the HTTP request in seconds.
        samples (int): Number of times to measure the load time.

    Returns:
        dict: A dictionary containing the page load times, average, stdev, and status code.
    """
    load_times = []
    status_code = None
    errors = []

    for _ in range(samples):
        try:
            start_time = time.time()
            response = requests.get(url, timeout=timeout)
            end_time = time.time()
            load_time = end_time - start_time
            load_times.append(load_time)
            status_code = response.status_code
            response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        except requests.exceptions.Timeout:
            errors.append(f"Request timed out after {timeout} seconds.")
            break # No need to try further samples if it times out
        except requests.exceptions.ConnectionError:
            errors.append("Failed to connect to the server.")
            break
        except requests.exceptions.HTTPError as e:
            errors.append(f"HTTP error occurred: {e.response.status_code} - {e.response.reason}")
            break
        except requests.exceptions.RequestException as e:
            errors.append(f"A general request error occurred: {e}")
            break
        except Exception as e:
            errors.append(f"An unexpected error occurred: {e}")
            break
    
    if errors:
        return {
            "url": url,
            "error": errors[0],
            "status_code": status_code # Will be None if no successful request
        }
    elif not load_times: # Should not happen if no errors and samples > 0
        return {
            "url": url,
            "error": "No load times recorded despite no explicit errors.",
            "status_code": status_code
        }
    else:
        avg_load_time = statistics.mean(load_times)
        stdev_load_time = statistics.stdev(load_times) if len(load_times) > 1 else 0.0
        return {
            "url": url,
            "samples": samples,
            "load_times_raw": [f"{t:.2f}" for t in load_times],
            "average_load_time": f"{avg_load_time:.2f}",
            "stdev_load_time": f"{stdev_load_time:.2f}",
            "status_code": status_code
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Audit the page load time of a given URL.')
    parser.add_argument('url', type=str, help='The URL to audit.')
    parser.add_argument('--timeout', type=int, default=10,
                        help='Timeout for the HTTP request in seconds (default: 10).')
    parser.add_argument('--samples', type=int, default=1,
                        help='Number of times to measure the load time (default: 1).')
    args = parser.parse_args()

    result = audit_page_load_time(args.url, args.timeout, args.samples)
    print(json.dumps(result, indent=2))
