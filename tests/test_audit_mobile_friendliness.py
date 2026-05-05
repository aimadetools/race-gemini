import unittest
from unittest.mock import patch, MagicMock
import requests
from audit_mobile_friendliness import audit_mobile_friendliness

class TestAuditMobileFriendliness(unittest.TestCase):

    @patch('requests.get')
    def test_mobile_friendly_with_full_viewport(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body></body></html>'
        mock_get.return_value = mock_response

        result = audit_mobile_friendliness("http://example.com")
        self.assertTrue(result['is_mobile_friendly'])
        self.assertIn("Viewport meta tag found with 'width=device-width' and 'initial-scale'.", result['details'])

    @patch('requests.get')
    def test_mobile_friendly_with_partial_viewport(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '<html><head><meta name="viewport" content="width=device-width"></head><body></body></html>'
        mock_get.return_value = mock_response

        result = audit_mobile_friendliness("http://example.com")
        self.assertTrue(result['is_mobile_friendly'])
        self.assertIn("Viewport meta tag found, but content might not be fully optimized for responsiveness.", result['details'])

    @patch('requests.get')
    def test_not_mobile_friendly_no_viewport(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '<html><head></head><body></body></html>'
        mock_get.return_value = mock_response

        result = audit_mobile_friendliness("http://example.com")
        self.assertFalse(result['is_mobile_friendly'])
        self.assertIn("No viewport meta tag found.", result['details'])

    @patch('requests.get')
    def test_request_exception(self, mock_get):
        mock_get.side_effect = requests.exceptions.RequestException("DNS lookup failed")

        result = audit_mobile_friendliness("http://invalid-url.com")
        self.assertFalse(result['is_mobile_friendly'])
        self.assertIn("Failed to retrieve page: DNS lookup failed", result['details'])

    @patch('requests.get')
    def test_http_error(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError('404 Client Error: Not Found for url: http://example.com')
        mock_get.return_value = mock_response

        result = audit_mobile_friendliness("http://example.com")
        self.assertFalse(result['is_mobile_friendly'])
        self.assertIn("Failed to retrieve page: 404 Client Error: Not Found", result['details'])

    @patch('requests.get')
    def test_empty_html(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = ''
        mock_get.return_value = mock_response

        result = audit_mobile_friendliness("http://example.com")
        self.assertFalse(result['is_mobile_friendly'])
        self.assertIn("No viewport meta tag found.", result['details'])

if __name__ == '__main__':
    unittest.main()
