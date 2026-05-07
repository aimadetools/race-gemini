
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import os

def audit(file_paths):
    """
    Finds all unique external links in a list of HTML files and checks their status.
    """
    links_to_check = set()
    for file_path in file_paths:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
            for a_tag in soup.find_all('a', href=True):
                link = a_tag['href']
                parsed_link = urlparse(link)
                if parsed_link.scheme and parsed_link.netloc:
                    links_to_check.add(link)
                elif not parsed_link.scheme and parsed_link.netloc:
                    links_to_check.add(f"https:{link}")
        except Exception as e:
            print(f"Error processing file {file_path}: {e}")
    
    broken_links = []
    session = requests.Session()
    session.headers.update({'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'})
    
    for i, link in enumerate(links_to_check):
        print(f"Checking link {i+1}/{len(links_to_check)}: {link}")
        try:
            check = session.get(link, allow_redirects=True, timeout=10, stream=True)
            if 400 <= check.status_code < 600:
                broken_links.append({'url': link, 'status_code': check.status_code})
            check.close()
        except requests.exceptions.RequestException as e:
            broken_links.append({'url': link, 'error': f'Failed to connect or timeout: {e}'})
            
    return broken_links
