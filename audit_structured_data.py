import requests
from bs4 import BeautifulSoup
import json

def audit_structured_data(url):
    """
    Checks if a given URL contains structured data (specifically JSON-LD).

    Args:
        url (str): The URL of the page to audit.

    Returns:
        dict: A dictionary containing the audit result.
              - 'has_structured_data' (bool): True if JSON-LD structured data is found, False otherwise.
              - 'structured_data_types' (list): A list of types found (e.g., 'Article', 'LocalBusiness').
              - 'details' (str): A message explaining the result.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    structured_data_types = []
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # Raise an HTTPError for bad responses (4xx or 5xx)
        soup = BeautifulSoup(response.text, 'lxml')

        json_ld_scripts = soup.find_all('script', type='application/ld+json')

        if json_ld_scripts:
            for script in json_ld_scripts:
                try:
                    data = json.loads(script.string)
                    # Handle single JSON-LD object or an array of objects
                    if isinstance(data, list):
                        for item in data:
                            if '@type' in item and item['@type'] not in structured_data_types:
                                structured_data_types.append(item['@type'])
                    elif isinstance(data, dict):
                        if '@type' in data and data['@type'] not in structured_data_types:
                            structured_data_types.append(data['@type'])
                except json.JSONDecodeError:
                    # Ignore malformed JSON-LD
                    continue
            if structured_data_types:
                return {
                    'has_structured_data': True,
                    'structured_data_types': structured_data_types,
                    'details': f"Found JSON-LD structured data with types: {', '.join(structured_data_types)}."
                }
            else:
                return {
                    'has_structured_data': False,
                    'structured_data_types': [],
                    'details': "Found JSON-LD script tags, but no valid '@type' found within the data."
                }
        else:
            return {
                'has_structured_data': False,
                'structured_data_types': [],
                'details': "No JSON-LD structured data found."
            }
    except requests.exceptions.RequestException as e:
        return {
            'has_structured_data': False,
            'structured_data_types': [],
            'details': f"Failed to retrieve page: {e}"
        }
    except Exception as e:
        return {
            'has_structured_data': False,
            'structured_data_types': [],
            'details': f"An unexpected error occurred: {e}"
        }

if __name__ == '__main__':
    # Example usage
    test_urls = [
        "https://www.google.com",  # Should have some structured data
        "https://developers.google.com/search/docs/guides/intro-structured-data", # Should have structured data
        "https://www.example.com", # Likely no structured data
    ]
    for test_url in test_urls:
        print(f"Auditing {test_url}:")
        result = audit_structured_data(test_url)
        print(f"  Has Structured Data: {result['has_structured_data']}")
        print(f"  Types: {result['structured_data_types']}")
        print(f"  Details: {result['details']}")
        print("-" * 30)
