import unittest
from unittest.mock import patch, MagicMock
import requests
import json
from audit_structured_data import audit_structured_data

class TestAuditStructuredData(unittest.TestCase):

    @patch('requests.get')
    def test_structured_data_found_single_object(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '''
        <html>
        <head>
            <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Article",
              "headline": "Test Article",
              "author": {
                "@type": "Person",
                "name": "Test Author"
              }
            }
            </script>
        </head>
        <body></body>
        </html>
        '''
        mock_get.return_value = mock_response

        result = audit_structured_data("http://example.com/article")
        self.assertTrue(result['has_structured_data'])
        self.assertEqual(result['structured_data_types'], ['Article'])
        self.assertIn("Found JSON-LD structured data with types: Article.", result['details'])

    @patch('requests.get')
    def test_structured_data_found_array_of_objects(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '''
        <html>
        <head>
            <script type="application/ld+json">
            [
              {
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                "name": "Test Business"
              },
              {
                "@context": "https://schema.org",
                "@type": "Event",
                "name": "Test Event"
              }
            ]
            </script>
        </head>
        <body></body>
        </html>
        '''
        mock_get.return_value = mock_response

        result = audit_structured_data("http://example.com/events")
        self.assertTrue(result['has_structured_data'])
        self.assertIn('LocalBusiness', result['structured_data_types'])
        self.assertIn('Event', result['structured_data_types'])
        self.assertIn("Found JSON-LD structured data with types: LocalBusiness, Event.", result['details'])

    @patch('requests.get')
    def test_no_structured_data(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '<html><head></head><body></body></html>'
        mock_get.return_value = mock_response

        result = audit_structured_data("http://example.com/no-sd")
        self.assertFalse(result['has_structured_data'])
        self.assertEqual(result['structured_data_types'], [])
        self.assertIn("No JSON-LD structured data found.", result['details'])

    @patch('requests.get')
    def test_malformed_json_ld(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '''
        <html>
        <head>
            <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "headline": "Test Article",
            }
            </script>
        </head>
        <body></body>
        </html>
        '''
        mock_get.return_value = mock_response

        result = audit_structured_data("http://example.com/malformed")
        self.assertFalse(result['has_structured_data'])
        self.assertEqual(result['structured_data_types'], [])
        self.assertIn("Found JSON-LD script tags, but no valid '@type' found within the data.", result['details'])

    @patch('requests.get')
    def test_json_ld_without_type(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '''
        <html>
        <head>
            <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "name": "Something"
            }
            </script>
        </head>
        <body></body>
        </html>
        '''
        mock_get.return_value = mock_response

        result = audit_structured_data("http://example.com/no-type")
        self.assertFalse(result['has_structured_data'])
        self.assertEqual(result['structured_data_types'], [])
        self.assertIn("Found JSON-LD script tags, but no valid '@type' found within the data.", result['details'])

    @patch('requests.get')
    def test_request_exception(self, mock_get):
        mock_get.side_effect = requests.exceptions.RequestException("Connection error")

        result = audit_structured_data("http://invalid-url.com")
        self.assertFalse(result['has_structured_data'])
        self.assertIn("Failed to retrieve page: Connection error", result['details'])

    @patch('requests.get')
    def test_http_error(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError('500 Server Error')
        mock_get.return_value = mock_response

        result = audit_structured_data("http://example.com/server-error")
        self.assertFalse(result['has_structured_data'])
        self.assertIn("Failed to retrieve page: 500 Server Error", result['details'])

if __name__ == '__main__':
    unittest.main()
