
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import os

def audit(file_paths):
    """
    Finds all unique external links in a list of HTML files and checks their status.
    Returns a dictionary with 'broken_links' and 'file_processing_errors'.
    """
    links_to_check = set()
    file_processing_errors = []

    for file_path in file_paths:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
            for a_tag in soup.find_all('a', href=True):
                link = a_tag['href']
                parsed_link = urlparse(link)
                # Check for external links (with scheme and netloc, or just netloc assuming https)
                if parsed_link.scheme and parsed_link.netloc:
                    links_to_check.add(link)
                elif not parsed_link.scheme and parsed_link.netloc: # e.g., //example.com/path
                    links_to_check.add(f"https:{link}")
                # TODO: Implement internal link checking for relative paths
        except Exception as e:
            file_processing_errors.append({
                "file": file_path,
                "error": f"Error processing file: {e}"
            })
    
    broken_links = []
    session = requests.Session()
    session.headers.update({'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'})
    
    for i, link in enumerate(links_to_check):
        try:
            check = session.get(link, allow_redirects=True, timeout=10, stream=True)
            if 400 <= check.status_code < 600:
                broken_links.append({'url': link, 'status_code': check.status_code})
            check.close()
        except requests.exceptions.RequestException as e:
            broken_links.append({'url': link, 'error': f'Failed to connect or timeout: {e}'})
            
    return {"broken_links": broken_links, "file_processing_errors": file_processing_errors}
