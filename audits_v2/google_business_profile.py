import sys
import json
import requests
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

def check_google_business_profile(business_name):
    if not business_name:
        return {
            'has_google_business_profile': False,
            'profile_url': None,
            'reason': 'Could not determine business name from website.'
        }
    
    google_places_api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not google_places_api_key:
        return {
            'has_google_business_profile': False,
            'profile_url': None,
            'reason': 'GOOGLE_PLACES_API_KEY is not set. Cannot use Google Places API.'
        }

    places_api_url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": google_places_api_key,
        "X-Goog-FieldMask": "places.displayName,places.googleMapsUri" # Request only necessary fields
    }
    payload = {
        "textQuery": business_name,
        "languageCode": "en" # Optional: specify language
    }

    try:
        response = requests.post(places_api_url, headers=headers, json=payload, timeout=10)
        response.raise_for_status() # Raise an exception for HTTP errors
        response_data = response.json()

        if response_data and 'places' in response_data and len(response_data['places']) > 0:
            for place in response_data['places']:
                if 'googleMapsUri' in place:
                    return {
                        'has_google_business_profile': True,
                        'profile_url': place['googleMapsUri'],
                        'reason': f"Found Google Business Profile for '{place.get('displayName', business_name)}' via Google Places API."
                    }
            
            return {
                'has_google_business_profile': False,
                'profile_url': None,
                'reason': f"Found places for '{business_name}' but no Google Maps URL was available."
            }
        else:
            return {
                'has_google_business_profile': False,
                'profile_url': None,
                'reason': f"No relevant Google Business Profile found for '{business_name}' via Google Places API."
            }

    except requests.exceptions.RequestException as e:
        return {
            'has_google_business_profile': False,
            'profile_url': None,
            'reason': f"An error occurred while querying Google Places API: {e}"
        }
    except json.JSONDecodeError:
        return {
            'has_google_business_profile': False,
            'profile_url': None,
            'reason': "Failed to decode JSON response from Google Places API."
        }

# Main audit function for integration with auditor_cli.py
def audit(target, target_type):
    issues = []
    business_name = get_business_name(target)

    result = check_google_business_profile(business_name)
    if 'issues' not in result:
        result['issues'] = []
    result['issues'].extend(issues)
    
    return result
