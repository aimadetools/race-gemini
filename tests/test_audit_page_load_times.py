import unittest
from unittest.mock import patch, MagicMock
from audits_v2.page_load_times import audit


class TestAuditPageLoadTimes(unittest.TestCase):

    @patch("requests.get")
    def test_audit_page_load_time_success(self, mock_get):
        # Mock the requests.get call
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        result = audit("https://example.com", target_type="url")

        self.assertIn("average_load_time", result["results"])
        self.assertEqual(result["results"]["status_code"], 200)
        self.assertEqual(result["issues"], [])

    @patch("requests.get")
    def test_audit_page_load_time_error(self, mock_get):
        # Mock requests.get to raise an exception
        mock_get.side_effect = Exception("Test error")

        result = audit("https://example.com", target_type="url")

        self.assertEqual(len(result["issues"]), 1)
        self.assertEqual(result["issues"][0]["type"], "ERROR")


if __name__ == "__main__":
    unittest.main()
