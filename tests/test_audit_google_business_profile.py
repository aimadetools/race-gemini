import unittest
from unittest.mock import patch, MagicMock
import json
import requests
import os
from audits_v2.google_business_profile import get_business_name, check_google_business_profile, perform_google_search

class MockResponse:
    def __init__(self, status_code, content=None, text=None):
        self.status_code = status_code
        if text is not None:
            self._text = text
            self._content = text.encode('utf-8') # Assume UTF-8 for content if text is provided
        elif content is not None:
            if isinstance(content, str): # If content is a string, encode it
                self._content = content.encode('utf-8')
                self._text = content
            else: # Assume content is already bytes
                self._content = content
                self._text = content.decode('utf-8', errors='ignore') # Decode content if only content is provided
        else:
            self._content = b''
            self._text = ""

    @property
    def content(self):
        return self._content

    @property
    def text(self):
        return self._text

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.exceptions.HTTPError(f"HTTP Error {self.status_code}", response=self)

class TestAuditGoogleBusinessProfile(unittest.TestCase):

    @patch('requests.get')
    def test_get_business_name_from_title(self, mock_get):
        mock_get.return_value = MockResponse(200, content="<html><head><title>My Awesome Business | Homepage</title></head></html>")
        business_name = get_business_name("http://example.com")
        self.assertEqual(business_name, "My Awesome Business")

    @patch('requests.get')
    def test_get_business_name_from_og_site_name(self, mock_get):
        mock_get.return_value = MockResponse(200, content='<html><head><meta property="og:site_name" content="My OG Business"></head></html>')
        business_name = get_business_name("http://example.com")
        self.assertEqual(business_name, "My OG Business")

    @patch('requests.get')
    def test_get_business_name_not_found(self, mock_get):
        mock_get.return_value = MockResponse(200, content="<html><head></head></html>")
        business_name = get_business_name("http://example.com")
        self.assertIsNone(business_name)

    @patch('requests.get')
    def test_check_google_business_profile_found_via_search(self, mock_get):
        mock_get.side_effect = [
            MockResponse(200, content="<html><head><title>Test Business</title></head></html>"), # for get_business_name
            MockResponse(200, text="""
                <html><body>
                    <a href="/url?q=https://www.google.com/maps/place/Test+Business&sa=U">Test Business on Maps</a>
                </body></html>
            """) # for perform_google_search
        ]
        
        result = check_google_business_profile("Test Business")
        self.assertTrue(result['has_google_business_profile'])
        self.assertIn("https://www.google.com/maps/place/Test+Business", result['profile_url'])
        self.assertIn("Found Google Business Profile", result['reason'])

    @patch('requests.get')
    def test_check_google_business_profile_not_found_via_search(self, mock_get):
        mock_get.side_effect = [
            MockResponse(200, content="<html><head><title>Non Existent Business</title></head></html>"), # for get_business_name
            MockResponse(200, text="""
                <html><body>
                    <a href="/url?q=https://www.example.com/other&sa=U">Other link</a>
                </body></html>
            """) # for perform_google_search
        ]
        
        result = check_google_business_profile("Non Existent Business")
        self.assertFalse(result['has_google_business_profile'])
        self.assertIsNone(result['profile_url'])
        self.assertIn("No clear Google Business Profile link found", result['reason'])

    @patch('requests.get')
    def test_perform_google_search_request_error(self, mock_get):
        # Mock for get_business_name
        mock_get_business_name_response = MockResponse(200, content="<html><head><title>Test Business</title></head></html>")

        # Mock for perform_google_search: Simulate a failed request with a 500 status code
        mock_failed_search_response = MockResponse(status_code=500, text="Internal Server Error")
        
        mock_get.side_effect = [
            mock_get_business_name_response,
            mock_failed_search_response
        ]
        
        result = check_google_business_profile("Test Business")
        self.assertFalse(result['has_google_business_profile'])
        self.assertIsNone(result['profile_url'])
        self.assertIn("An error occurred while performing Google search: HTTP Error 500", result['reason'])

    def test_check_google_business_profile_no_business_name(self):
        result = check_google_business_profile(None)
        self.assertFalse(result['has_google_business_profile'])
        self.assertEqual(result['reason'], 'Could not determine business name from website.')
