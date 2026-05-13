import requests
from bs4 import BeautifulSoup
import json
from urllib.parse import urljoin

class LocalBusinessSchemaAudit:
    """
    Audits a given URL for the presence and correctness of Schema.org LocalBusiness markup (JSON-LD).
    It checks for essential properties and common subtypes to ensure comprehensive validation.
    """
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
            return

        found_local_business_schema = False
        for script in json_ld_scripts:
            try:
                data = json.loads(script.string)
                # Handle single object or array of objects
                schemas = [data] if not isinstance(data, list) else data

                for schema in schemas:
                    schema_type = schema.get('@type')
                    # Check if it's LocalBusiness or a type that inherits from LocalBusiness
                    if schema_type and (schema_type == "LocalBusiness" or
                                        (isinstance(schema_type, list) and "LocalBusiness" in schema_type) or
                                        self._is_sub_type_of_local_business(schema_type)):
                        
                        found_local_business_schema = True
                        self.findings.append(f"Found LocalBusiness schema of type: {schema_type}")
                        self._validate_local_business_properties(schema)

            except json.JSONDecodeError as e:
                self.findings.append(f"Invalid JSON-LD found: {e}. Script content: {script.string[:100]}...")
            except Exception as e:
                self.findings.append(f"Error processing JSON-LD script: {e}. Script content: {script.string[:100]}...")
        
        if not found_local_business_schema:
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

        Args:
            schema (dict): The parsed LocalBusiness schema object.
        """
        for prop in self.essential_properties:
            if prop not in schema or not schema[prop]:
                self.findings.append(f"Missing or empty essential LocalBusiness property: '{prop}'")
            elif prop == "address":
                # Validate address sub-properties
                address = schema[prop]
                if isinstance(address, dict):
                    for sub_prop in self.address_sub_properties:
                        if sub_prop not in address or not address[sub_prop]:
                            self.findings.append(f"Missing or empty essential address sub-property: 'address.{sub_prop}'")
                else:
                    self.findings.append(f"Address property is not a structured object: '{address}'")
            elif prop == "geo":
                geo = schema[prop]
                if not isinstance(geo, dict) or "latitude" not in geo or "longitude" not in geo:
                    self.findings.append(f"Missing or malformed 'geo' property (requires 'latitude' and 'longitude').")


if __name__ == "__main__":
    # Example usage:
    # Test with a URL that has LocalBusiness schema
    test_url_good = "https://www.example.com/local-business-with-schema" # Placeholder for a URL with LocalBusiness schema
    # test_url_good = "https://schema.org/LocalBusiness" # This one describes schema.org but doesn't have an example.
    # A real example would be a local business website with proper JSON-LD
    test_url_no_schema = "https://www.example.com" # Should not have schema

    print("
--- Auditing a URL expected to have LocalBusiness schema ---")
    audit_good = LocalBusinessSchemaAudit(test_url_good)
    results_good = audit_good.run_audit()
    for finding in results_good:
        print(f"- {finding}")

    print("
--- Auditing a URL expected to have NO LocalBusiness schema ---")
    audit_no_schema = LocalBusinessSchemaAudit(test_url_no_schema)
    results_no_schema = audit_no_schema.run_audit()
    for finding in results_no_schema:
        print(f"- {finding}")
