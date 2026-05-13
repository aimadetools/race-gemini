import requests
from bs4 import BeautifulSoup
import json

def audit(target_url):
    """
    Performs an audit for schema.org markup presence on the given target URL.

    Args:
        target_url (str): The URL of the page to audit.

    Returns:
        dict: Standardized audit results including 'audit_type' and a list of 'issues'.
    """
    issues = []
    audit_type = "schema_markup"

    try:
        response = requests.get(target_url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Check for JSON-LD scripts
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        
        # Check for microdata (itemtype attribute)
        microdata_elements = soup.find_all(itemtype=True)

        # Check for RDFa (vocab attribute)
        rdfa_elements = soup.find_all(vocab=True)

        if not json_ld_scripts and not microdata_elements and not rdfa_elements:
            issues.append({
                "type": "No Schema Markup Found",
                "description": f"No schema.org markup (JSON-LD, Microdata, or RDFa) was found on {target_url}.",
                "url": target_url
            })
        else:
            # If any schema markup is found, we consider it a success for presence
            # Future enhancements could validate content.
            if json_ld_scripts:
                issues.append({
                    "type": "JSON-LD Schema Found",
                    "description": f"JSON-LD schema.org markup found on {target_url}.",
                    "url": target_url,
                    "count": len(json_ld_scripts)
                })
            if microdata_elements:
                issues.append({
                    "type": "Microdata Schema Found",
                    "description": f"Microdata schema.org markup found on {target_url}.",
                    "url": target_url,
                    "count": len(microdata_elements)
                })
            if rdfa_elements:
                issues.append({
                    "type": "RDFa Schema Found",
                    "description": f"RDFa schema.org markup found on {target_url}.",
                    "url": target_url,
                    "count": len(rdfa_elements)
                })
            
    except requests.exceptions.RequestException as e:
        issues.append({
            "type": "Network Error",
            "description": f"Failed to fetch URL {target_url}: {e}",
            "url": target_url
        })
    except Exception as e:
        issues.append({
            "type": "Processing Error",
            "description": f"An unexpected error occurred during schema markup audit for {target_url}: {e}",
            "url": target_url
        })
    
    return {"audit_type": audit_type, "issues": issues}
