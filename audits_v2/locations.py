import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re

def _run_locations_audit(url, locations_db, max_depth, source_identifier="N/A"):
    """
    Audits a website to find which locations from a given list are mentioned.
    """
    issues = []
    mentioned_locations = set()
    all_crawled_links = set()

    def get_all_links_internal(start_url, current_max_depth):
        visited = set()
        queue = [(start_url, 0)]
        internal_links = set()
        internal_links.add(start_url)

        while queue:
            current_url, depth = queue.pop(0)
            if current_url in visited or depth > current_max_depth:
                continue
            
            visited.add(current_url)
            all_crawled_links.add(current_url)

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
                            if depth + 1 <= current_max_depth:
                                queue.append((normalized_link, depth + 1))
            except requests.RequestException:
                issues.append({
                    "type": "WARNING",
                    "message": f"Could not fetch {current_url} during crawl: {e}",
                    "source": source_identifier
                })
                continue # Continue crawling other links even if one fails
                
        return internal_links

    def find_locations_in_text(text, db):
        found = set()
        for location in db:
            if re.search(r'\b' + re.escape(location) + r'\b', text, re.IGNORECASE):
                found.add(location)
        return found
    
    # Start crawling from the target URL
    try:
        links_to_check = get_all_links_internal(url, max_depth)
    except Exception as e:
        issues.append({
            "type": "ERROR",
            "message": f"Initial crawl failed for {url}: {e}",
            "source": source_identifier
        })
        return {
            "audit_type": "locations",
            "results": {},
            "issues": issues
        }


    for link in links_to_check:
        try:
            response = requests.get(link, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            text_to_search = ""
            if soup.title:
                text_to_search += soup.title.string + " "
            for header in soup.find_all(['h1', 'h2', 'h3']):
                text_to_search += header.get_text() + " "
            
            if len(text_to_search.split()) < 20 and soup.body: # Only get body text if headers are short and body exists
                 text_to_search += soup.body.get_text()

            found = find_locations_in_text(text_to_search, locations_db)
            mentioned_locations.update(found)
        except requests.RequestException as e:
            issues.append({
                "type": "WARNING",
                "message": f"Could not fetch {link} for location analysis: {e}",
                "source": source_identifier
            })
            continue
    
    mentioned_locations_list = list(mentioned_locations)
    missed_locations = [loc for loc in locations_db if loc not in mentioned_locations_list]
    
    results = {
        "url_audited": url,
        "max_crawl_depth": max_depth,
        "total_locations_to_check": len(locations_db),
        "crawled_links_count": len(all_crawled_links),
        "locations_found": mentioned_locations_list,
        "locations_not_found": missed_locations,
        "found_count": len(mentioned_locations_list),
        "not_found_count": len(missed_locations)
    }
    
    return {"audit_type": "locations", "results": results, "issues": issues}


def audit(target_content, target_type='html_content', **kwargs):
    """
    Performs locations audit on the given target content (URL).

    Args:
        target_content: The URL to audit (required for this audit type).
        target_type (str): Specifies the type of target_content ('url' is expected).
        **kwargs: Additional options.
                  'locations_db' (list): A list of locations to search for.
                  'max_depth' (int): Maximum depth for crawling internal links (default: 2).

    Returns:
        dict: Standardized audit results including 'audit_type', 'results', and 'issues'.
    """
    issues = []
    url = target_content
    source_identifier = kwargs.get('source_identifier', url)

    if target_type != 'url':
        issues.append({
            "type": "ERROR",
            "message": f"Unsupported target_type '{target_type}' for locations audit. Only 'url' is supported.",
            "source": source_identifier
        })
        return {"audit_type": "locations", "results": {}, "issues": issues}

    locations_db = kwargs.get('locations_db')
    if not isinstance(locations_db, list) or not locations_db:
        issues.append({
            "type": "ERROR",
            "message": "Locations list ('locations_db') is missing or invalid in kwargs.",
            "source": source_identifier
        })
        return {"audit_type": "locations", "results": {}, "issues": issues}
    
    max_depth = kwargs.get('max_depth', 2) # Default max_depth to 2 if not provided

    return _run_locations_audit(url, locations_db, max_depth, source_identifier)
