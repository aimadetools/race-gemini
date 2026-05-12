
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import os

def audit(file_paths, base_url, project_root):
    """
    Finds all unique external and internal links in a list of HTML files and checks their status.
    `base_url` is the base URL of the deployed site (e.g., "https://www.localseogen.com").
    `project_root` is the absolute path to the project's root directory (e.g., "/home/race/race-gemini").
    """
    links_to_check = set()
    file_processing_errors = []

    for file_path in file_paths:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            soup = BeautifulSoup(content, 'html.parser')

            # Calculate the relative URL path for the current local file
            # This allows resolving relative links correctly against the file's deployed URL
            relative_file_path = os.path.relpath(file_path, project_root)
            # Ensure URL path uses forward slashes, especially on Windows
            relative_file_path = relative_file_path.replace(os.sep, '/')
            current_page_url = urljoin(base_url, relative_file_path)

            for a_tag in soup.find_all('a', href=True):
                link = a_tag['href']
                parsed_link = urlparse(link)

                if parsed_link.scheme or parsed_link.netloc: # Absolute or protocol-relative external link
                    if not parsed_link.scheme and parsed_link.netloc: # e.g., //example.com/path
                        links_to_check.add(f"https:{link}")
                    else:
                        links_to_check.add(link)
                elif link.startswith('#'): # Anchor link on the same page, ignore
                    continue
                else: # Internal relative link (root-relative or path-relative)
                    full_internal_url = urljoin(current_page_url, link)
                    # Ensure it's still within the same domain
                    if urlparse(full_internal_url).netloc == urlparse(base_url).netloc:
                        links_to_check.add(full_internal_url)

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
