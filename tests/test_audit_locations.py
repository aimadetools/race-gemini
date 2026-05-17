import unittest
from unittest.mock import patch, MagicMock
from audits_v2.locations import audit


class TestAuditLocations(unittest.TestCase):

    @patch("requests.get")
    def test_audit_locations(self, mock_get):
        # Mocking multiple responses for the crawler
        mock_responses = {
            "http://example.com": MagicMock(
                status_code=200,
                text='<html><head><title>Home</title></head><body><a href="/services">Services</a></body></html>',
            ),
            "http://example.com/services": MagicMock(
                status_code=200,
                text="<html><head><title>Services in New York</title></head><body><h1>Our Services</h1><p>We offer plumbing in Los Angeles.</p></body></html>",
            ),
        }

        def side_effect(url, timeout=10):
            return mock_responses.get(url, MagicMock(status_code=404))

        mock_get.side_effect = side_effect

        locations_db = ["New York", "Los Angeles", "Chicago"]
        result = audit(
            "http://example.com", target_type="url", locations_db=locations_db
        )

        self.assertIn("New York", result["results"]["locations_found"])
        self.assertIn("Los Angeles", result["results"]["locations_found"])
        self.assertNotIn("Chicago", result["results"]["locations_found"])


if __name__ == "__main__":
    unittest.main()
