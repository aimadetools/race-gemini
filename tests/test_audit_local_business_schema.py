import unittest
from unittest.mock import patch, MagicMock
from audits_v2.local_business_schema import LocalBusinessSchemaAudit
import requests
import json

class TestLocalBusinessSchemaAudit(unittest.TestCase):

    def setUp(self):
        self.test_url = "http://example.com"
        # We patch the class to avoid actual external calls
        self.audit_instance = LocalBusinessSchemaAudit(self.test_url)
        # We can also mock the geocode address to not depend on the API key for most tests
        self.audit_instance._geocode_address = MagicMock(return_value=(None, None))
        self.audit_instance.findings = [] # Reset findings for each test

    @patch('requests.get')
    def test_no_json_ld_found(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = "<html><body><h1>No Schema Here</h1></body></html>"
        
        findings = self.audit_instance.run_audit()
        self.assertIn("No JSON-LD schema.org markup found on the page.", findings)
        self.assertIn("No schema of '@type': 'LocalBusiness' or its subtypes found on the page.", findings)

    @patch('requests.get')
    def test_empty_json_ld_script(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = """
        <html><body>
            <script type="application/ld+json"></script>
        </body></html>
        """
        findings = self.audit_instance.run_audit()
        self.assertTrue(any("Invalid JSON-LD found: Script tag content is empty" in f for f in findings))
        self.assertIn("No schema of '@type': 'LocalBusiness' or its subtypes found on the page.", findings)

    @patch('requests.get')
    def test_valid_local_business_schema_minimal(self, mock_get):
        schema_data = {
            "@context": "http://schema.org",
            "@type": "LocalBusiness",
            "name": "Test Business",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "123 Main St",
                "addressLocality": "Anytown",
                "addressRegion": "CA",
                "postalCode": "90210",
                "addressCountry": "US"
            },
            "telephone": "+1-555-123-4567",
            "url": "http://example.com/test-business",
            "hasMap": "http://example.com/map",
            "openingHoursSpecification": [],
            "priceRange": "$$",
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": "34.0522",
                "longitude": "-118.2437"
            },
            "image": "http://example.com/logo.png"
        }
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = f"""
        <html><body>
            <script type="application/ld+json">{json.dumps(schema_data)}</script>
        </body></html>
        """
        
        findings = self.audit_instance.run_audit()
        self.assertTrue(any("Found LocalBusiness schema of type: LocalBusiness" in f for f in findings))
        # Check that there are no "Missing" findings
        self.assertFalse(any("Missing" in f for f in findings))

    @patch('requests.get')
    def test_local_business_schema_missing_essential_property(self, mock_get):
        schema_data = {
            "@context": "http://schema.org",
            "@type": "LocalBusiness",
            "name": "Test Business",
            # telephone is missing
        }
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = f"""
        <html><body>
            <script type="application/ld+json">{json.dumps(schema_data)}</script>
        </body></html>
        """
        
        findings = self.audit_instance.run_audit()
        self.assertTrue(any("Found LocalBusiness schema of type: LocalBusiness" in f for f in findings))
        self.assertTrue(any("Missing or empty essential LocalBusiness property: 'telephone'" in f for f in findings))

    @patch('requests.get')
    def test_local_business_schema_missing_address_sub_property(self, mock_get):
        schema_data = {
            "@context": "http://schema.org",
            "@type": "LocalBusiness",
            "name": "Test Business",
            "address": {
                "@type": "PostalAddress",
                # streetAddress is missing
            }
        }
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = f"""
        <html><body>
            <script type="application/ld+json">{json.dumps(schema_data)}</script>
        </body></html>
        """
        
        findings = self.audit_instance.run_audit()
        self.assertTrue(any("Found LocalBusiness schema of type: LocalBusiness" in f for f in findings))
        self.assertTrue(any("Missing or empty essential address sub-property: 'address.streetAddress'" in f for f in findings))


if __name__ == '__main__':
    unittest.main()
