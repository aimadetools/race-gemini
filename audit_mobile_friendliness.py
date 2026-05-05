import requests
from bs4 import BeautifulSoup

def audit_mobile_friendliness(url):
    """
    Checks if a given URL has a viewport meta tag, which is a basic indicator of mobile-friendliness.

    Args:
        url (str): The URL of the page to audit.

    Returns:
        dict: A dictionary containing the audit result.
              - 'is_mobile_friendly' (bool): True if a viewport meta tag is found, False otherwise.
              - 'details' (str): A message explaining the result.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # Raise an HTTPError for bad responses (4xx or 5xx)
        soup = BeautifulSoup(response.text, 'lxml')

        viewport_meta = soup.find('meta', attrs={'name': 'viewport'})

        if viewport_meta:
            content = viewport_meta.get('content', '').lower()
            # Basic check for common viewport settings for responsiveness
            if 'width=device-width' in content and 'initial-scale=' in content:
                return {
                    'is_mobile_friendly': True,
                    'details': "Viewport meta tag found with 'width=device-width' and 'initial-scale'. This page appears to be mobile-friendly."
                }
            else:
                return {
                    'is_mobile_friendly': True,
                    'details': "Viewport meta tag found, but content might not be fully optimized for responsiveness."
                }
        else:
            return {
                'is_mobile_friendly': False,
                'details': "No viewport meta tag found. This page may not be optimized for mobile devices."
            }
    except requests.exceptions.RequestException as e:
        return {
            'is_mobile_friendly': False,
            'details': f"Failed to retrieve page: {e}"
        }
    except Exception as e:
        return {
            'is_mobile_friendly': False,
            'details': f"An unexpected error occurred: {e}"
        }

if __name__ == '__main__':
    # Example usage
    test_urls = [
        "https://www.google.com",
        "https://www.example.com",
        "https://www.gemini.google.com"
    ]
    for test_url in test_urls:
        print(f"Auditing {test_url}:")
        result = audit_mobile_friendliness(test_url)
        print(f"  Mobile Friendly: {result['is_mobile_friendly']}")
        print(f"  Details: {result['details']}")
        print("-" * 30)
