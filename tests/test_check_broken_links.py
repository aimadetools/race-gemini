
import unittest
from unittest.mock import patch, MagicMock
import os
import json
import requests
from check_broken_links import check_external_links

class TestCheckBrokenLinks(unittest.TestCase):

    def setUp(self):
        # Create a dummy HTML file for testing local file functionality
        self.dummy_html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Test Page</title>
        </head>
        <body>
            <a href="http://example.com/valid-link">Valid External Link</a>
            <a href="https://broken.example.com/broken-link">Broken External Link</a>
            <a href="/internal-link">Internal Link</a>
            <a href="relative-link.html">Relative Link</a>
            <a href="//protocol-relative.example.com/test">Protocol Relative Link</a>
        </body>
        </html>
        """
        self.dummy_html_path = "dummy_test_file.html"
        with open(self.dummy_html_path, "w", encoding="utf-8") as f:
            f.write(self.dummy_html_content)

        # Create another dummy HTML file for URL content testing
        self.dummy_url_html_content = """
        <!DOCTYPE html>
        <html>
        <body>
            <a href="http://urltest.com/valid">Valid URL Link</a>
            <a href="https://urltest.com/broken">Broken URL Link</a>
        </body>
        </html>
        """
        self.dummy_url_path = "http://test-server.com/test-page.html"


    def tearDown(self):
        # Clean up the dummy HTML file
        if os.path.exists(self.dummy_html_path):
            os.remove(self.dummy_html_path)

    @patch('requests.Session')
    @patch('requests.get')
    def test_check_external_links_local_file(self, mock_requests_get, mock_requests_session):
        # Mock requests.get for initial source fetch (if source is a URL)
        # and for subsequent link checks
        mock_response_source = MagicMock()
        mock_response_source.status_code = 200
        mock_response_source.content = self.dummy_url_html_content.encode('utf-8')
        mock_requests_get.return_value = mock_response_source

        # Mock the session.get for external link checks
        mock_session_instance = MagicMock()
        mock_requests_session.return_value = mock_session_instance

        # Simulate responses for the links found in dummy_html_content
        def mock_session_get_side_effect(url, **kwargs):
            mock_resp = MagicMock()
            if "example.com/valid-link" in url:
                mock_resp.status_code = 200
            elif "broken.example.com/broken-link" in url:
                mock_resp.status_code = 404
            elif "protocol-relative.example.com/test" in url:
                mock_resp.status_code = 200
            else:
                raise Exception("Unexpected URL in mock_session_get_side_effect")
            mock_resp.close = MagicMock()
            return mock_resp

        mock_session_instance.get.side_effect = mock_session_get_side_effect

        broken_links = check_external_links(self.dummy_html_path)

        # Expect only the broken link to be reported
        self.assertEqual(len(broken_links), 1)
        self.assertEqual(broken_links[0]['url'], 'https://broken.example.com/broken-link')
        self.assertEqual(broken_links[0]['status_code'], 404)

    @patch('requests.Session')
    @patch('requests.get')
    def test_check_external_links_url_source(self, mock_requests_get, mock_requests_session):
        # Mock requests.get for initial source fetch
        mock_response_source = MagicMock()
        mock_response_source.status_code = 200
        mock_response_source.content = self.dummy_url_html_content.encode('utf-8')
        mock_requests_get.return_value = mock_response_source

        # Mock the session.get for external link checks
        mock_session_instance = MagicMock()
        mock_requests_session.return_value = mock_session_instance

        # Simulate responses for the links found in dummy_url_html_content
        def mock_session_get_side_effect(url, **kwargs):
            mock_resp = MagicMock()
            if "urltest.com/valid" in url:
                mock_resp.status_code = 200
            elif "urltest.com/broken" in url:
                mock_resp.status_code = 500 # Server error
            else:
                raise Exception("Unexpected URL in mock_session_get_side_effect")
            mock_resp.close = MagicMock()
            return mock_resp

        mock_session_instance.get.side_effect = mock_session_get_side_effect

        broken_links = check_external_links(self.dummy_url_path)

        self.assertEqual(len(broken_links), 1)
        self.assertEqual(broken_links[0]['url'], 'https://urltest.com/broken')
        self.assertEqual(broken_links[0]['status_code'], 500)
        
        # Verify that requests.get was called for the initial URL source
        mock_requests_get.assert_called_once_with(self.dummy_url_path, timeout=10)

    def test_check_external_links_invalid_source(self):
        broken_links = check_external_links("non_existent_file.html")
        self.assertEqual(len(broken_links), 1)
        self.assertIn('Invalid source', broken_links[0]['error'])

    @patch('requests.Session')
    @patch('requests.get', side_effect=requests.exceptions.RequestException("DNS Error"))
    def test_check_external_links_url_fetch_failure(self, mock_requests_get, mock_requests_session):
        broken_links = check_external_links("http://unreachable.com")
        self.assertEqual(len(broken_links), 1)
        self.assertIn('Failed to fetch URL', broken_links[0]['error'])

    @patch('requests.Session')
    @patch('builtins.open', side_effect=IOError("Permission denied"))
    def test_check_external_links_local_file_read_failure(self, mock_open, mock_requests_session):
        broken_links = check_external_links(self.dummy_html_path)
        self.assertEqual(len(broken_links), 1)
        self.assertIn('Failed to read local file', broken_links[0]['error'])

    @patch('requests.Session')
    @patch('requests.get')
    def test_check_external_links_no_links(self, mock_requests_get, mock_requests_session):
        empty_html = "<html><body></body></html>"
        with open("empty_test_file.html", "w", encoding="utf-8") as f:
            f.write(empty_html)

        broken_links = check_external_links("empty_test_file.html")
        self.assertEqual(len(broken_links), 0)
        os.remove("empty_test_file.html")

    @patch('requests.Session')
    @patch('requests.get')
    def test_check_external_links_link_connection_error(self, mock_requests_get, mock_requests_session):
        # Mock requests.get for initial source fetch
        mock_response_source = MagicMock()
        mock_response_source.status_code = 200
        mock_response_source.content = self.dummy_url_html_content.encode('utf-8')
        mock_requests_get.return_value = mock_response_source

        # Mock the session.get for external link checks
        mock_session_instance = MagicMock()
        mock_requests_session.return_value = mock_session_instance
        mock_session_instance.get.side_effect = requests.exceptions.RequestException("Connection refused")

        broken_links = check_external_links(self.dummy_url_path)

        self.assertEqual(len(broken_links), 2) # Both links will fail due to connection error
        self.assertIn('Failed to connect or timeout', broken_links[0]['error'])
        self.assertIn('Failed to connect or timeout', broken_links[1]['error'])

if __name__ == '__main__':
    unittest.main()
