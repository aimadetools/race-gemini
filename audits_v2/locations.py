import sys
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re
import argparse # Import argparse

def get_all_links(url, max_depth): # max_depth is now passed explicitly
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
        except requests.RequestException as e:
            # print(f"Warning: Could not fetch {current_url} - {e}")
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

def audit_locations(url, locations_db, max_depth): # Pass max_depth to audit_locations
    """
    Audits a website to find which locations from a given list are mentioned.
    """
    all_links = get_all_links(url, max_depth) # Use max_depth here
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
        except requests.RequestException as e:
            # print(f"Warning: Could not fetch {link} - {e}")
            continue
    
    return list(mentioned_locations)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Audit a website for mentions of specific locations.')
    parser.add_argument('url', type=str, help='The starting URL of the website to audit.')
    parser.add_argument('--locations-file', type=str, required=True,
                        help='Path to a JSON file containing a list of locations to check.')
    parser.add_argument('--max-depth', type=int, default=2,
                        help='Maximum depth for crawling internal links (default: 2).')
    args = parser.parse_args()

    website_url = args.url
    max_depth = args.max_depth
    
    try:
        with open(args.locations_file, 'r', encoding='utf-8') as f:
            locations_to_check = json.load(f)
        if not isinstance(locations_to_check, list):
            raise ValueError("Locations data in file should be a JSON list.")
    except FileNotFoundError:
        print(json.dumps({"error": f"Locations file not found at '{args.locations_file}'"}))
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON format in locations file: {e}"}))
        sys.exit(1)
    except ValueError as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

    
    results = audit_locations(website_url, locations_to_check, max_depth) # Pass max_depth

    # Calculate missed locations
    missed_locations = [loc for loc in locations_to_check if loc not in results]
    
    output = {
        "url_audited": website_url,
        "max_crawl_depth": max_depth,
        "locations_found": results,
        "locations_not_found": missed_locations,
        "found_count": len(results),
        "not_found_count": len(missed_locations)
    }
    
    print(json.dumps(output, indent=4))

