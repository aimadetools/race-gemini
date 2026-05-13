import sys
import json
import requests
from requests.exceptions import RequestException, HTTPError
from bs4 import BeautifulSoup
import re
import os

def get_business_name(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        # 1. Try to get from Schema.org Organization name
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                schema_data = json.loads(script.string)
                if isinstance(schema_data, list):
                    for item in schema_data:
                        if item.get('@type') == 'Organization' and item.get('name'):
                            return item['name'].strip()
                elif schema_data.get('@type') == 'Organization' and schema_data.get('name'):
                    return schema_data['name'].strip()
            except json.JSONDecodeError:
                continue

        # 2. Fallback to Open Graph site name
        og_site_name = soup.find('meta', property='og:site_name')
        if og_site_name and og_site_name.get('content'):
            return og_site_name.get('content').strip()

        # 3. Fallback to <title>
        if soup.title and soup.title.string:
            title = soup.title.string
            # Attempt to extract common patterns: "Business Name | Slogan", "Slogan - Business Name", "Business Name"
            if '|' in title:
                return title.split('|')[0].strip()
            if '-' in title:
                # Prioritize part before first '-' if it seems like a name
                parts = title.split('-')
                if len(parts) > 1 and len(parts[0].strip()) > 3: # Avoid single letter or very short names
                    return parts[0].strip()
            # If no common delimiters, just return the whole title string, cleaned
            return title.strip()
            
        # 4. Fallback to <h1> tag
        h1 = soup.find('h1')
        if h1 and h1.string:
            return h1.string.strip()

        return None
    except requests.exceptions.RequestException as e:
        # Log error or handle more gracefully if needed
        return None

def perform_google_search(query):
    search_url = f"https://www.google.com/search?q={requests.utils.quote(query)}"
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(search_url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']

            # Prioritize direct Google Maps or Business Profile links
            if "google.com/maps" in href or "business.google.com" in href:
                return href, None
            
            # Then check for /url?q= redirects
            match = re.search(r"url\?q=(.*?)(?:&sa=U|$)", href)
            if match:
                potential_url = requests.utils.unquote(match.group(1))
                if "google.com/maps" in potential_url or "business.google.com" in potential_url:
                    return potential_url, None
        return None, None # No URL found, no error
    except (RequestException, HTTPError) as e:
        return None, f"An error occurred while performing Google search: {e}" # No URL found, error message

def check_google_business_profile(business_name, get_business_name_func=get_business_name, perform_google_search_func=perform_google_search):
    if not business_name:
        return {
            'has_google_business_profile': False,
            'profile_url': None,
            'reason': 'Could not determine business name from website.'
        }
    
    search_query = f"{business_name} Google Business Profile"
    profile_url, error_message = perform_google_search_func(search_query)

    if error_message:
        return {
            'has_google_business_profile': False,
            'profile_url': None,
            'reason': error_message
        }
    elif profile_url:
        return {
            'has_google_business_profile': True,
            'profile_url': profile_url,
            'reason': f"Found Google Business Profile for '{business_name}' via Google search."
        }
    else:
        return {
            'has_google_business_profile': False,
            'profile_url': None,
            'reason': f"No clear Google Business Profile link found for '{business_name}' via Google search."
        }
# Main audit function for integration with auditor_cli.py
def audit(target, target_type):
    issues = []
    business_name = get_business_name(target)

    result = check_google_business_profile(business_name, get_business_name_func=get_business_name, perform_google_search_func=perform_google_search)
    if 'issues' not in result:
        result['issues'] = []
    result['issues'].extend(issues)
    
    return result
