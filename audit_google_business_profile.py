
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
        
        # Try to get from <title>
        if soup.title and soup.title.string:
            # Clean up the title
            title = soup.title.string.split('|')[0].strip()
            return title
            
        # Fallback to Open Graph site name
        og_site_name = soup.find('meta', property='og:site_name')
        if og_site_name and og_site_name.get('content'):
            return og_site_name.get('content').strip()

        return None
    except requests.exceptions.RequestException as e:
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

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No URL provided.'}))
        sys.exit(1)
        
    url = sys.argv[1]
    business_name = get_business_name(url)
    result = check_google_business_profile(business_name)
    
    print(json.dumps(result))
