
import sys
import json
import requests
from bs4 import BeautifulSoup
import argparse # Import argparse

def audit_structured_data(url):
    """
    Audits the structured data of a given URL.

    Args:
        url (str): The URL to audit.

    Returns:
        dict: A dictionary containing the structured data found.
    """
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        soup = BeautifulSoup(response.content, 'html.parser')
        structured_data = []
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                structured_data.append(json.loads(script.string))
            except json.JSONDecodeError:
                pass
        return {
            "url": url,
            "structured_data": structured_data
        }
    except requests.exceptions.Timeout:
        return {"url": url, "error": "Request timed out."}
    except requests.exceptions.RequestException as e:
        return {"url": url, "error": f"Request failed: {e}"}
    except Exception as e:
        return {"url": url, "error": f"An unexpected error occurred: {e}"}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Audit structured data (JSON-LD) from a given URL.')
    parser.add_argument('url', type=str, help='The URL to audit for structured data.')
    args = parser.parse_args()

    result = audit_structured_data(args.url)
    print(json.dumps(result, indent=2))
