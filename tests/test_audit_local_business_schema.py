import unittest
from unittest.mock import patch, MagicMock
from audits_v2.local_business_schema import LocalBusinessSchemaAudit
import requests
import json

class TestLocalBusinessSchemaAudit(unittest.TestCase):

    def setUp(self):
        self.test_url = "http://example.com"
        self.audit_instance = LocalBusinessSchemaAudit(self.test_url)

    @patch('requests.get')
    def test_no_json_ld_found(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = "<html><body><h1>No Schema Here</h1></body></html>"
        
        findings = self.audit_instance.run_audit()
        self.assertIn("No JSON-LD schema.org markup found on the page.", findings)
        self.assertIn("No schema of '@type': 'LocalBusiness' or its subtypes found on the page.", findings)
        self.assertEqual(len(findings), 2)

    @patch('requests.get')
    def test_empty_json_ld_script(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = """
        <html><body>
            <script type="application/ld+json"></script>
        </body></html>
        """
        findings = self.audit_instance.run_audit()
        self.assertIn("Invalid JSON-LD found: Script tag content is empty or contains only whitespace. Script element: <script type=\"application/ld+json\">\n</script>...", findings[0])
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
            "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "Monday",
                "opens": "09:00",
                "closes": "17:00"
            },
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
        self.assertIn("Found LocalBusiness schema of type: LocalBusiness", findings)
        self.assertEqual(len(findings), 1) # Only one finding for schema found

    @patch('requests.get')
    def test_local_business_schema_missing_essential_property(self, mock_get):
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
            # "telephone" is missing
            "url": "http://example.com/test-business",
            "hasMap": "http://example.com/map",
            "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "Monday",
                "opens": "09:00",
                "closes": "17:00"
            },
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
        self.assertIn("Found LocalBusiness schema of type: LocalBusiness", findings)
        self.assertIn("Missing or empty essential LocalBusiness property: 'telephone'", findings)
        self.assertEqual(len(findings), 2)

    @patch('requests.get')
    def test_local_business_schema_missing_address_sub_property(self, mock_get):
        schema_data = {
            "@context": "http://schema.org",
            "@type": "LocalBusiness",
            "name": "Test Business",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "123 Main St",
                # "addressLocality" is missing
                "addressRegion": "CA",
                "postalCode": "90210",
                "addressCountry": "US"
            },
            "telephone": "+1-555-123-4567",
            "url": "http://example.com/test-business",
            "hasMap": "http://example.com/map",
            "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "Monday",
                "opens": "09:00",
                "closes": "17:00"
            },
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
        self.assertIn("Found LocalBusiness schema of type: LocalBusiness", findings)
        self.assertIn("Missing or empty essential address sub-property: 'address.addressLocality'", findings)
        self.assertEqual(len(findings), 2)

    @patch('requests.get')
    def test_local_business_schema_malformed_geo(self, mock_get):
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
            "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "Monday",
                "opens": "09:00",
                "closes": "17:00"
            },
            "priceRange": "$$",
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": "34.0522",
                # "longitude" is missing
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
        self.assertIn("Found LocalBusiness schema of type: LocalBusiness", findings)
        self.assertIn("Missing or malformed 'geo' property (requires 'latitude' and 'longitude').", findings)
        self.assertEqual(len(findings), 2)

    @patch('requests.get')
    def test_local_business_subtype(self, mock_get):
        schema_data = {
            "@context": "http://schema.org",
            "@type": "Dentist", # Subtype of LocalBusiness
            "name": "Test Dentist",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "123 Main St",
                "addressLocality": "Anytown",
                "addressRegion": "CA",
                "postalCode": "90210",
                "addressCountry": "US"
            },
            "telephone": "+1-555-123-4567",
            "url": "http://example.com/test-dentist",
            "hasMap": "http://example.com/map",
            "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "Monday",
                "opens": "09:00",
                "closes": "17:00"
            },
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
        self.assertIn("Found LocalBusiness schema of type: Dentist", findings)
        self.assertEqual(len(findings), 1)

    @patch('requests.get')
    def test_non_local_business_schema(self, mock_get):
        schema_data = {
            "@context": "http://schema.org",
            "@type": "Article",
            "headline": "Test Article",
            "author": "Test Author"
        }
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = f"""
        <html><body>
            <script type="application/ld+json">{json.dumps(schema_data)}</script>
        </body></html>
        """
        
        findings = self.audit_instance.run_audit()
        self.assertIn("No schema of '@type': 'LocalBusiness' or its subtypes found on the page.", findings)
        self.assertEqual(len(findings), 1)
    
    @patch('requests.get')
    def test_url_fetch_failure(self, mock_get):
        mock_get.side_effect = requests.exceptions.RequestException("Network is down")
        
        findings = self.audit_instance.run_audit()
        self.assertIn("Error fetching URL http://example.com: Network is down", findings)
        self.assertEqual(len(findings), 1)

    @patch('requests.get')
    def test_multiple_schemas_one_local_business(self, mock_get):
        schema_data_lb = {
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
            "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "Monday",
                "opens": "09:00",
                "closes": "17:00"
            },
            "priceRange": "$$",
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": "34.0522",
                "longitude": "-118.2437"
            },
            "image": "http://example.com/logo.png"
        }
        schema_data_article = {
            "@context": "http://schema.org",
            "@type": "Article",
            "headline": "Another Article",
            "author": "Jane Doe"
        }
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = f"""
        <html><body>
            <script type="application/ld+json">{json.dumps(schema_data_lb)}</script>
            <script type="application/ld+json">{json.dumps(schema_data_article)}</script>
        </body></html>
        """
        
        findings = self.audit_instance.run_audit()
        self.assertIn("Found LocalBusiness schema of type: LocalBusiness", findings)
        self.assertEqual(len(findings), 1) # Only one finding for schema found, no others.

    @patch('requests.get')
    def test_local_business_schema_empty_essential_property(self, mock_get):
        schema_data = {
            "@context": "http://schema.org",
            "@type": "LocalBusiness",
            "name": "", # Empty name
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
            "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "Monday",
                "opens": "09:00",
                "closes": "17:00"
            },
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
        self.assertIn("Found LocalBusiness schema of type: LocalBusiness", findings)
        self.assertIn("Missing or empty essential LocalBusiness property: 'name'", findings)
        self.assertEqual(len(findings), 2)


if __name__ == '__main__':
    unittest.main()
