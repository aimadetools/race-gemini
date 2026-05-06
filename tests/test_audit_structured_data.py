
import unittest
import json
from unittest.mock import patch
from audit_structured_data import audit_structured_data

class TestAuditStructuredData(unittest.TestCase):

    @patch('audit_structured_data.requests.get')
    def test_audit_structured_data_found(self, mock_get):
        """
        Tests the audit_structured_data function when structured data is found.
        """
        mock_get.return_value.content = b'<html><head><script type="application/ld+json">{"@context": "https://schema.org", "@type": "Person", "name": "John Doe"}</script></head></html>'
        url = "https://example.com"
        result = audit_structured_data(url)
        self.assertIn("structured_data", result)
        self.assertEqual(len(result["structured_data"]), 1)
        self.assertEqual(result["structured_data"][0]["name"], "John Doe")

    @patch('audit_structured_data.requests.get')
    def test_audit_structured_data_not_found(self, mock_get):
        """
        Tests the audit_structured_data function when no structured data is found.
        """
        mock_get.return_value.content = b'<html><head></head></html>'
        url = "https://example.com"
        result = audit_structured_data(url)
        self.assertIn("structured_data", result)
        self.assertEqual(len(result["structured_data"]), 0)

    def test_no_url_provided(self):
        """
        Tests the script's behavior when no URL is provided.
        """
        import subprocess
        result = subprocess.run(["venv/bin/python", "audit_structured_data.py"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(json.loads(result.stdout), {"error": "No URL provided"})

    @patch('audit_structured_data.requests.get')
    def test_audit_structured_data_error(self, mock_get):
        """
        Tests the audit_structured_data function when an error occurs.
        """
        mock_get.side_effect = Exception("Test error")
        url = "https://example.com"
        result = audit_structured_data(url)
        self.assertIn("error", result)

if __name__ == '__main__':
    unittest.main()
