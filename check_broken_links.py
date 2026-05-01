import sys
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin

def check_external_links(url):
    """
    Fetches a URL, finds all unique external links, and checks their status.

    Args:
        url (str): The URL to audit.

    Returns:
        list: A list of dictionaries, where each dictionary represents a broken
              link and contains 'url' and 'status_code'.
    """
    broken_links = []
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
    except requests.exceptions.RequestException as e:
        return [{'url': url, 'error': str(e)}]

    links = set()
    for a_tag in soup.find_all('a', href=True):
        link = a_tag['href']
        parsed_link = urlparse(link)

        if parsed_link.scheme and parsed_link.netloc:
            # Absolute external link
            links.add(link)
        elif not parsed_link.scheme and parsed_link.netloc:
             # Protocol-relative URL, e.g. //example.com
            links.add(f"https:{link}")
        # We are ignoring internal links for now.

    session = requests.Session()
    session.headers.update({'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'})

    for link in links:
        try:
            # Use a HEAD request for efficiency
            check = session.head(link, allow_redirects=True, timeout=5)
            if 400 <= check.status_code < 600:
                broken_links.append({'url': link, 'status_code': check.status_code})
        except requests.exceptions.RequestException:
            # If HEAD fails, it could be because the server doesn't support it.
            # We could try a GET, but for now we'll just report it as an issue.
            broken_links.append({'url': link, 'error': 'Failed to connect or timeout'})

    return broken_links

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_url = sys.argv[1]
        results = {
            'broken_links': check_external_links(target_url)
        }
        print(json.dumps(results, indent=4))
    else:
        error_message = {'error': 'No URL provided as a command-line argument.'}
        print(json.dumps(error_message, indent=4))

