
import sys
import json
import requests
from bs4 import BeautifulSoup

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
        soup = BeautifulSoup(response.content, 'html.parser')
        structured_data = []
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                structured_data.append(json.loads(script.string))
            except json.JSONDecodeError:
                pass
        return {
            "structured_data": structured_data
        }
    except Exception as e:
        return {
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        url_to_audit = sys.argv[1]
        result = audit_structured_data(url_to_audit)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No URL provided"}))
        sys.exit(1)
