import sys
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import os

def check_external_links(source):
    """
    Fetches content from a URL or reads from a local file, finds all unique external links, and checks their status.

    Args:
        source (str): The URL or file path to audit.

    Returns:
        list: A list of dictionaries, where each dictionary represents a broken
              link and contains 'url' and 'status_code' or 'error'.
    """
    broken_links = []
    content = None
    
    parsed_source = urlparse(source)

    if parsed_source.scheme and parsed_source.netloc: # It's a URL
        try:
            response = requests.get(source, timeout=10)
            response.raise_for_status()
            content = response.content
        except requests.exceptions.RequestException as e:
            return [{'url': source, 'error': f"Failed to fetch URL: {e}"}]
    elif os.path.exists(source): # It's a local file path
        try:
            with open(source, 'r', encoding='utf-8') as f:
                content = f.read()
        except IOError as e:
            return [{'file': source, 'error': f"Failed to read local file: {e}"}]
    else:
        return [{'source': source, 'error': "Invalid source: Not a valid URL or existing file path."}]

    if content is None:
        return [{'source': source, 'error': "Could not retrieve content from source."}]

    soup = BeautifulSoup(content, 'html.parser')

    links_to_check = set()
    for a_tag in soup.find_all('a', href=True):
        link = a_tag['href']
        parsed_link = urlparse(link)

        if parsed_link.scheme and parsed_link.netloc:
            # Absolute external link
            links_to_check.add(link)
        elif not parsed_link.scheme and parsed_link.netloc:
             # Protocol-relative URL, e.g. //example.com
            links_to_check.add(f"https:{link}")
        # We are ignoring internal links and relative links for now.

    session = requests.Session()
    session.headers.update({'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'})

    for link in links_to_check:
        try:
            # Use a HEAD request for efficiency
            check = session.head(link, allow_redirects=True, timeout=5)
            if 400 <= check.status_code < 600:
                broken_links.append({'url': link, 'status_code': check.status_code})
        except requests.exceptions.RequestException as e:
            broken_links.append({'url': link, 'error': f'Failed to connect or timeout: {e}'})

    return broken_links

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_source = sys.argv[1]
        results = {
            'broken_links': check_external_links(target_source)
        }
        print(json.dumps(results, indent=4))
    else:
        error_message = {'error': 'No URL or file path provided as a command-line argument.'}
        print(json.dumps(error_message, indent=4))

