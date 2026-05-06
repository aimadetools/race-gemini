
import sys
import json
import time
import requests

def audit_page_load_time(url):
    """
    Audits the page load time of a given URL.

    Args:
        url (str): The URL to audit.

    Returns:
        dict: A dictionary containing the page load time.
    """
    try:
        start_time = time.time()
        response = requests.get(url, timeout=10)
        end_time = time.time()
        load_time = end_time - start_time
        return {
            "load_time": f"{load_time:.2f}",
            "status_code": response.status_code
        }
    except Exception as e:
        return {
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        url_to_audit = sys.argv[1]
        result = audit_page_load_time(url_to_audit)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No URL provided"}))
