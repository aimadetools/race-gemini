
import sys
import json
import requests
from bs4 import BeautifulSoup
import re

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

def check_google_business_profile(business_name):
    if not business_name:
        return {
            'has_google_business_profile': False,
            'profile_url': None,
            'reason': 'Could not determine business name from website.'
        }
        
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
    }
    
    try:
        search_query = f'"{business_name}"'
        search_url = f"https://www.google.com/search?q={search_query}"
        
        response = requests.get(search_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for the Google Business Profile in the search results
        # It's often in a special "knowledge panel"
        for a in soup.find_all('a', href=True):
            if 'google.com/maps/place/' in a['href']:
                return {
                    'has_google_business_profile': True,
                    'profile_url': a['href'],
                    'reason': 'Found a link to Google Maps in the search results.'
                }
        
        return {
            'has_google_business_profile': False,
            'profile_url': None,
            'reason': 'No Google Business Profile found on the first page of Google search results.'
        }
        
    except requests.exceptions.RequestException as e:
        return {
            'has_google_business_profile': False,
            'profile_url': None,
            'reason': f"An error occurred while searching Google: {e}"
        }

# Main audit function for integration with auditor_cli.py
def audit(target, target_type):
    if target_type != 'url':
        return {'error': f"An unexpected error occurred: Google Business Profile audit only supports URLs as targets."}

    business_name = get_business_name(target)
    result = check_google_business_profile(business_name)
    
    return result

