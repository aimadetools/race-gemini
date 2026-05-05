
import unittest
from unittest.mock import patch, MagicMock
import json
import requests
from audit_google_business_profile import get_business_name, check_google_business_profile

class TestAuditGoogleBusinessProfile(unittest.TestCase):

    @patch('requests.get')
    def test_get_business_name_from_title(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = "<html><head><title>My Awesome Business | Homepage</title></head></html>"
        mock_get.return_value = mock_response

        business_name = get_business_name("http://example.com")
        self.assertEqual(business_name, "My Awesome Business")

    @patch('requests.get')
    def test_get_business_name_from_og_site_name(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = '<html><head><meta property="og:site_name" content="My OG Business"></head></html>'
        mock_get.return_value = mock_response

        business_name = get_business_name("http://example.com")
        self.assertEqual(business_name, "My OG Business")

    @patch('requests.get')
    def test_get_business_name_not_found(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = "<html><head></head></html>"
        mock_get.return_value = mock_response

        business_name = get_business_name("http://example.com")
        self.assertIsNone(business_name)

    @patch('requests.get')
    def test_check_google_business_profile_found(self, mock_get):
        mock_google_search_response = MagicMock()
        mock_google_search_response.status_code = 200
        mock_google_search_response.content = '<html><body><a href="https://www.google.com/maps/place/My+Awesome+Business/">Link</a></body></html>'
        mock_get.return_value = mock_google_search_response

        result = check_google_business_profile("My Awesome Business")
        self.assertTrue(result['has_google_business_profile'])
        self.assertIn("google.com/maps/place", result['profile_url'])

    @patch('requests.get')
    def test_check_google_business_profile_not_found(self, mock_get):
        mock_google_search_response = MagicMock()
        mock_google_search_response.status_code = 200
        mock_google_search_response.content = '<html><body><p>No results found</p></body></html>'
        mock_get.return_value = mock_google_search_response

        result = check_google_business_profile("My Awesome Business")
        self.assertFalse(result['has_google_business_profile'])
        self.assertIsNone(result['profile_url'])
        self.assertEqual(result['reason'], 'No Google Business Profile found on the first page of Google search results.')

    def test_check_google_business_profile_no_business_name(self):
        result = check_google_business_profile(None)
        self.assertFalse(result['has_google_business_profile'])
        self.assertEqual(result['reason'], 'Could not determine business name from website.')

    @patch('requests.get', side_effect=requests.exceptions.RequestException("Test Error"))
    def test_check_google_business_profile_request_error(self, mock_get):
        result = check_google_business_profile("My Awesome Business")
        self.assertFalse(result['has_google_business_profile'])
        self.assertIn("An error occurred while searching Google", result['reason'])

if __name__ == '__main__':
    unittest.main()
