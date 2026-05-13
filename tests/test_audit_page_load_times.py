
import unittest
import json
from unittest.mock import patch
from audits_v2.page_load_times import audit_page_load_time

class TestAuditPageLoadTimes(unittest.TestCase):

    @patch('audit_page_load_times.requests.get')
    def test_audit_page_load_time(self, mock_get):
        """
        Tests the audit_page_load_time function with a mock URL.
        """
        mock_get.return_value.status_code = 200
        url = "https://example.com"
        result = audit_page_load_time(url)
        self.assertIn("load_time", result)
        self.assertIn("status_code", result)
        self.assertEqual(result["status_code"], 200)

    def test_no_url_provided(self):
        """
        Tests the script's behavior when no URL is provided.
        """
        import subprocess
        result = subprocess.run(["python3", "audit_page_load_times.py"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout), {"error": "No URL provided"})

    @patch('audit_page_load_times.requests.get')
    def test_audit_page_load_time_error(self, mock_get):
        """
        Tests the audit_page_load_time function when an error occurs.
        """
        mock_get.side_effect = Exception("Test error")
        url = "https://example.com"
        result = audit_page_load_time(url)
        self.assertIn("error", result)

if __name__ == '__main__':
    unittest.main()
