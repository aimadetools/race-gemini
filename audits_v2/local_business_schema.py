import requests
from bs4 import BeautifulSoup
import json
from urllib.parse import urljoin
import os

class LocalBusinessSchemaAudit:
    """
    Audits a given URL for the presence and correctness of Schema.org LocalBusiness markup (JSON-LD).
    It checks for essential properties and common subtypes to ensure comprehensive validation.
    """
    OPENCAGE_API_URL = "https://api.opencagedata.com/geocode/v1/json"

    def __init__(self, url):
        self.url = url
        self.findings = []
        self.essential_properties = [
            "name", "address", "telephone", "url", "hasMap",
            "openingHoursSpecification", "priceRange", "geo", "image"
        ]
        self.address_sub_properties = [
            "streetAddress", "addressLocality", "addressRegion", "postalCode", "addressCountry"
        ]
        self.opencage_api_key = os.getenv("OPENCAGE_API_KEY")
        if not self.opencage_api_key:
            self.findings.append("Warning: OPENCAGE_API_KEY environment variable not set. Geocoding validation will be skipped.")

    def _geocode_address(self, address_str):
        """
        Geocodes an address string using the OpenCage Geocoding API.

        Args:
            address_str (str): The address to geocode.

        Returns:
            tuple: (latitude, longitude) if successful, otherwise (None, None).
        """
        if not self.opencage_api_key:
            return None, None

        params = {
            'q': address_str,
            'key': self.opencage_api_key,
            'language': 'en',
            'pretty': 1,
            'no_annotations': 1
        }
        try:
            response = requests.get(self.OPENCAGE_API_URL, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if data and data['results']:
                geometry = data['results'][0]['geometry']
                return geometry['lat'], geometry['lng']
            else:
                self.findings.append(f"Geocoding failed for address '{address_str}': No results found.")
                return None, None
        except requests.exceptions.RequestException as e:
            self.findings.append(f"OpenCage API request failed for '{address_str}': {e}")
            return None, None
        except Exception as e:
            self.findings.append(f"Error parsing OpenCage API response for '{address_str}': {e}")
            return None, None

    def run_audit(self):
        """
        Executes the Local Business Schema audit by fetching the URL content,
        parsing JSON-LD scripts, and validating the schema.
        
        Returns:
            list: A list of findings, including errors, schema presence, and validation results.
        """
        print(f"Running Local Business Schema Audit for: {self.url}")
        try:
            response = requests.get(self.url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            self._check_local_business_schema(soup)
        except requests.exceptions.RequestException as e:
            self.findings.append(f"Error fetching URL {self.url}: {e}")
        except Exception as e:
            self.findings.append(f"An unexpected error occurred: {e}")
        
        return self.findings

    def _check_local_business_schema(self, soup):
        """
        Checks the parsed HTML (soup) for JSON-LD scripts containing LocalBusiness schema.

        Args:
            soup (BeautifulSoup): The BeautifulSoup object of the parsed HTML.
        """
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        
        if not json_ld_scripts:
            self.findings.append("No JSON-LD schema.org markup found on the page.")
        

        found_local_business_schema_in_scripts = False
        for script in json_ld_scripts:
            try:
                if not script.string or not script.string.strip():
                    self.findings.append(f"Invalid JSON-LD found: Script tag content is empty or contains only whitespace. Script element: {script.prettify().strip()[:200]}...")
                    continue

                data = json.loads(script.string)
                # Handle single object or array of objects
                schemas = [data] if not isinstance(data, list) else data

                for schema in schemas:
                    schema_type = schema.get('@type')
                    # Check if it's LocalBusiness or a type that inherits from LocalBusiness
                    if schema_type and (schema_type == "LocalBusiness" or
                                        (isinstance(schema_type, list) and "LocalBusiness" in schema_type) or
                                        self._is_sub_type_of_local_business(schema_type)):
                        
                        found_local_business_schema_in_scripts = True
                        self.findings.append(f"Found LocalBusiness schema of type: {schema_type}")
                        self._validate_local_business_properties(schema)

            except json.JSONDecodeError as e:
                self.findings.append(f"Invalid JSON-LD found: {e}. Script content: {script.string[:100]}...")
            except Exception as e:
                self.findings.append(f"Error processing JSON-LD script: {e}. Script content: {script.string[:100]}...")
        
        # After checking all scripts, if no LocalBusiness schema was found in any scripts,
        # add the general finding.
        if not found_local_business_schema_in_scripts:
            self.findings.append("No schema of '@type': 'LocalBusiness' or its subtypes found on the page.")

    def _is_sub_type_of_local_business(self, schema_type):
        """
        Checks if a given schema_type is a known subtype of LocalBusiness.
        This is a simplified check and does not traverse the full schema.org hierarchy.

        Args:
            schema_type (str or list): The '@type' field from the schema.

        Returns:
            bool: True if the schema_type is a recognized LocalBusiness subtype, False otherwise.
        """
        # A simple check for common subtypes. A more robust solution would involve a schema graph.
        # For now, manually list some common ones that directly inherit.
        # This is a simplification; a real check would involve recursive lookup in schema.org.
        local_business_sub_types = [
            "AnimalShelter", "AutomotiveBusiness", "ChildCare", "Dentist", "DryCleaningOrLaundry",
            "EmergencyService", "FinancialService", "FoodEstablishment", "GovernmentOffice",
            "HealthAndBeautyBusiness", "HomeAndConstructionBusiness", "InternetCafe",
            "LegalService", "Library", "LodgingBusiness", "MedicalBusiness", "NailSalon",
            "NightlifeActivity", "NotaryService", "PerformingArtsTheater", "PetStore",
            "ProfessionalService", "RadioStation", "RealEstateAgent", "RecyclingCenter",
            "SelfStorage", "ShoppingCenter", "SportsActivityLocation", "Store", "TelevisionStation",
            "TouristInformationCenter", "TravelAgency"
        ]
        if isinstance(schema_type, list):
            return any(t in local_business_sub_types for t in schema_type)
        return schema_type in local_business_sub_types


    def _validate_local_business_properties(self, schema):
        """
        Validates the essential properties within a LocalBusiness schema.
        Also, geocodes the address and compares it with the 'geo' coordinates if present.

        Args:
            schema (dict): The parsed LocalBusiness schema object.
        """
        address_obj = None
        address_str_parts = []
        
        # First, validate all essential properties and extract address for geocoding later
        for prop in self.essential_properties:
            if prop not in schema or not schema[prop]:
                self.findings.append(f"Missing or empty essential LocalBusiness property: '{prop}'")
                continue # Continue to check other properties
            
            if prop == "address":
                address_obj = schema[prop]
                if isinstance(address_obj, dict):
                    # Build address string for geocoding
                    for sub_prop in self.address_sub_properties:
                        if sub_prop not in address_obj or not address_obj[sub_prop]:
                            self.findings.append(f"Missing or empty essential address sub-property: 'address.{sub_prop}'")
                        else:
                            address_str_parts.append(str(address_obj[sub_prop]))
                    
                else:
                    self.findings.append(f"Address property is not a structured object: '{address_obj}'")
            
            elif prop == "geo":
                # Geo property validation will happen after potential geocoding
                pass
            
            # General check for other properties
            elif not isinstance(schema[prop], (str, dict, list)) or (isinstance(schema[prop], str) and not schema[prop].strip()):
                if prop not in ["geo", "address"]: # Already handled
                    self.findings.append(f"Essential property '{prop}' is present but empty or invalid: '{schema[prop]}'")

        # Geocode the address if available and API key is set
        geocoded_lat, geocoded_lon = None, None
        if address_obj and address_str_parts and self.opencage_api_key:
            address_str = ", ".join(address_str_parts)
            self.findings.append(f"Attempting to geocode address: {address_str}")
            geocoded_lat, geocoded_lon = self._geocode_address(address_str)
            if geocoded_lat is not None and geocoded_lon is not None:
                self.findings.append(f"Address geocoded by OpenCage: Lat={geocoded_lat}, Lon={geocoded_lon}")
        elif address_obj and not address_str_parts:
             self.findings.append(f"Could not construct a full address string for geocoding from schema address: {address_obj}")
        
        # Now validate the geo property and compare if geocoding was successful
        if "geo" in schema and schema["geo"]:
            geo = schema["geo"]
            if not isinstance(geo, dict) or "latitude" not in geo or "longitude" not in geo:
                self.findings.append(f"Missing or malformed 'geo' property (requires 'latitude' and 'longitude').")
            else:
                try:
                    schema_lat = float(geo["latitude"])
                    schema_lon = float(geo["longitude"])
                    self.findings.append(f"Schema geo coordinates: Lat={schema_lat}, Lon={schema_lon}")

                    # Compare with geocoded coordinates if available
                    if geocoded_lat is not None and geocoded_lon is not None:
                        # Use a small tolerance for floating point comparison
                        tolerance = 0.001 
                        if abs(schema_lat - geocoded_lat) > tolerance or abs(schema_lon - geocoded_lon) > tolerance:
                            self.findings.append(f"Geo coordinates mismatch! "
                                                 f"Schema: ({schema_lat}, {schema_lon}), "
                                                 f"Geocoded: ({geocoded_lat}, {geocoded_lon}). "
                                                 f"This may indicate inaccurate schema data.")
                        else:
                            self.findings.append(f"Schema geo coordinates match geocoded coordinates within tolerance.")

                except ValueError:
                    self.findings.append(f"Invalid 'latitude' or 'longitude' format in 'geo' property (must be numeric).")




if __name__ == "__main__":
    # Example usage:
    # Test with a URL that has LocalBusiness schema
    test_url_good = "https://www.example.com/local-business-with-schema" # Placeholder for a URL with LocalBusiness schema
    # test_url_good = "https://schema.org/LocalBusiness" # This one describes schema.org but doesn't have an example.
    # A real example would be a local business website with proper JSON-LD
    test_url_no_schema = "https://www.example.com" # Should not have schema

    # print("
    # --- Auditing a URL expected to have LocalBusiness schema ---")
    # audit_good = LocalBusinessSchemaAudit(test_url_good)
    # results_good = audit_good.run_audit()
    # for finding in results_good:
    #     print(f"- {finding}")

    # print("
    # --- Auditing a URL expected to have NO LocalBusiness schema ---")
    # audit_no_schema = LocalBusinessSchemaAudit(test_url_no_schema)
    # results_no_schema = audit_no_schema.run_audit()
    # for finding in results_no_schema:
    #     print(f"- {finding}")
