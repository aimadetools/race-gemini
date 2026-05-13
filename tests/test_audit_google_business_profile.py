import unittest
from unittest.mock import patch, MagicMock
import json
import requests
import os # Import os
from audits_v2.google_business_profile import get_business_name, check_google_business_profile

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

    @patch.dict(os.environ, {'GOOGLE_PLACES_API_KEY': 'mock_api_key'})
    @patch('requests.post')
    def test_check_google_business_profile_found_with_places_api(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "places": [
                {
                    "displayName": {"text": "My Awesome Business", "languageCode": "en"},
                    "googleMapsUri": "https://maps.app.goo.gl/someplace"
                }
            ]
        }
        mock_post.return_value = mock_response

        result = check_google_business_profile("My Awesome Business")
        self.assertTrue(result['has_google_business_profile'])
        self.assertEqual(result['profile_url'], "https://maps.app.goo.gl/someplace")
        self.assertIn("Found Google Business Profile", result['reason'])

    @patch.dict(os.environ, {'GOOGLE_PLACES_API_KEY': 'mock_api_key'})
    @patch('requests.post')
    def test_check_google_business_profile_not_found_with_places_api(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "places": []
        }
        mock_post.return_value = mock_response

        result = check_google_business_profile("Non Existent Business")
        self.assertFalse(result['has_google_business_profile'])
        self.assertIsNone(result['profile_url'])
        self.assertIn("No relevant Google Business Profile found", result['reason'])

    @patch.dict(os.environ, {'GOOGLE_PLACES_API_KEY': 'mock_api_key'})
    @patch('requests.post')
    def test_check_google_business_profile_found_but_no_maps_uri(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "places": [
                {
                    "displayName": {"text": "My Awesome Business", "languageCode": "en"}
                    # No googleMapsUri
                }
            ]
        }
        mock_post.return_value = mock_response

        result = check_google_business_profile("My Awesome Business")
        self.assertFalse(result['has_google_business_profile'])
        self.assertIsNone(result['profile_url'])
        self.assertIn("Found places for 'My Awesome Business' but no Google Maps URL was available", result['reason'])

    def test_check_google_business_profile_no_business_name(self):
        result = check_google_business_profile(None)
        self.assertFalse(result['has_google_business_profile'])
        self.assertEqual(result['reason'], 'Could not determine business name from website.')

    @patch('requests.post', side_effect=requests.exceptions.RequestException("Test API Error"))
    @patch.dict(os.environ, {'GOOGLE_PLACES_API_KEY': 'mock_api_key'})
    def test_check_google_business_profile_request_error_with_places_api(self, mock_post):
        result = check_google_business_profile("My Awesome Business")
        self.assertFalse(result['has_google_business_profile'])
        self.assertIn("An error occurred while querying Google Places API", result['reason'])

    @patch.dict(os.environ, {'GOOGLE_PLACES_API_KEY': 'mock_api_key'})
    @patch('requests.post')
    def test_check_google_business_profile_json_decode_error(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "doc", 0)
        mock_post.return_value = mock_response

        result = check_google_business_profile("My Awesome Business")
        self.assertFalse(result['has_google_business_profile'])
        self.assertIn("Failed to decode JSON response from Google Places API.", result['reason'])

    def test_check_google_business_profile_no_api_key(self):
        # Temporarily unset the GOOGLE_PLACES_API_KEY environment variable
        with patch.dict(os.environ, {}, clear=True):
            result = check_google_business_profile("My Awesome Business")
            self.assertFalse(result['has_google_business_profile'])
            self.assertIsNone(result['profile_url'])
            self.assertIn("GOOGLE_PLACES_API_KEY is not set", result['reason'])
