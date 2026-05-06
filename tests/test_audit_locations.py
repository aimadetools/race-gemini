
import unittest
from unittest.mock import patch, MagicMock
import json
from audit_locations import get_all_links, find_locations_in_text, audit_locations

class TestAuditLocations(unittest.TestCase):

    @patch('requests.get')
    def test_get_all_links(self, mock_get):
        # Mocking the response from requests.get
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = """
        <html><body>
            <a href="/page1">Page 1</a>
            <a href="https://external.com">External</a>
            <a href="/page2">Page 2</a>
        </body></html>
        """
        mock_get.return_value = mock_response

        links = get_all_links('http://example.com')
        self.assertIn('http://example.com', links)
        self.assertIn('http://example.com/page1', links)
        self.assertIn('http://example.com/page2', links)
        self.assertNotIn('https://external.com', links)

    def test_find_locations_in_text(self):
        locations_db = ["New York", "Los Angeles", "Chicago"]
        text = "We serve New York and surrounding areas. Also Los Angeles."
        found = find_locations_in_text(text, locations_db)
        self.assertEqual(found, {"New York", "Los Angeles"})

        text_case_insensitive = "chicago is a great city."
        found_case = find_locations_in_text(text_case_insensitive, locations_db)
        self.assertEqual(found_case, {"Chicago"})

        text_no_match = "We serve Boston."
        found_none = find_locations_in_text(text_no_match, locations_db)
        self.assertEqual(found_none, set())

    @patch('requests.get')
    def test_audit_locations(self, mock_get):
        # Mocking multiple responses for the crawler
        mock_responses = {
            'http://example.com': MagicMock(status_code=200, text='<html><head><title>Home</title></head><body><a href="/services">Services</a></body></html>'),
            'http://example.com/services': MagicMock(status_code=200, text='<html><head><title>Services in New York</title></head><body><h1>Our Services</h1><p>We offer plumbing in Los Angeles.</p></body></html>')
        }

        def side_effect(url, timeout=10):
            return mock_responses.get(url, MagicMock(status_code=404))

        mock_get.side_effect = side_effect
        
        locations_db = ["New York", "Los Angeles", "Chicago"]
        mentioned = audit_locations('http://example.com', locations_db)
        
        self.assertIn("New York", mentioned)
        self.assertIn("Los Angeles", mentioned)
        self.assertNotIn("Chicago", mentioned)

if __name__ == '__main__':
    unittest.main()
