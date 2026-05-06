
import sys
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re

def get_all_links(url, max_depth=2):
    """
    Crawls a website starting from the given URL up to a max_depth
    and returns a set of all internal links.
    """
    visited = set()
    queue = [(url, 0)]
    internal_links = set()
    internal_links.add(url)

    while queue:
        current_url, depth = queue.pop(0)
        if current_url in visited or depth > max_depth:
            continue
        
        visited.add(current_url)

        try:
            response = requests.get(current_url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            for a_tag in soup.find_all('a', href=True):
                link = a_tag['href']
                joined_link = urljoin(current_url, link)
                parsed_link = urlparse(joined_link)
                
                # We are only interested in internal links
                if urlparse(current_url).netloc == parsed_link.netloc:
                    # Normalize link to remove fragments
                    normalized_link = f"{parsed_link.scheme}://{parsed_link.netloc}{parsed_link.path}"
                    if normalized_link not in internal_links:
                        internal_links.add(normalized_link)
                        if depth + 1 <= max_depth:
                            queue.append((normalized_link, depth + 1))
        except requests.RequestException:
            continue
            
    return internal_links

def find_locations_in_text(text, locations_db):
    """
    Finds mentions of locations from the database in the given text.
    Uses regex to find whole word matches.
    """
    found_locations = set()
    for location in locations_db:
        # Using word boundaries to match whole words only, case-insensitive
        if re.search(r'\b' + re.escape(location) + r'\b', text, re.IGNORECASE):
            found_locations.add(location)
    return found_locations

def audit_locations(url, locations_db):
    """
    Audits a website to find which locations from a given list are mentioned.
    """
    all_links = get_all_links(url)
    mentioned_locations = set()

    for link in all_links:
        try:
            response = requests.get(link, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Search in titles and headers first
            text_to_search = ""
            if soup.title:
                text_to_search += soup.title.string + " "
            for header in soup.find_all(['h1', 'h2', 'h3']):
                text_to_search += header.get_text() + " "
            
            # If not enough text, search the whole body
            if len(text_to_search.split()) < 20:
                 text_to_search += soup.body.get_text()

            found = find_locations_in_text(text_to_search, locations_db)
            mentioned_locations.update(found)
        except requests.RequestException:
            continue
    
    return list(mentioned_locations)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python audit_locations.py <url> <locations_json_string>"}))
        sys.exit(1)

    website_url = sys.argv[1]
    locations_json = sys.argv[2]
    
    try:
        locations_to_check = json.loads(locations_json)
        if not isinstance(locations_to_check, list):
            raise ValueError("Locations data should be a list.")
    except (json.JSONDecodeError, ValueError) as e:
        print(json.dumps({"error": f"Invalid locations format: {e}"}))
        sys.exit(1)

    
    results = audit_locations(website_url, locations_to_check)
    
    # Calculate missed locations
    missed_locations = [loc for loc in locations_to_check if loc not in results]
    
    output = {
        "mentioned_locations": results,
        "missed_locations": missed_locations,
        "mentioned_count": len(results),
        "missed_count": len(missed_locations)
    }
    
    print(json.dumps(output, indent=4))

