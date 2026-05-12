
import unittest
from unittest.mock import patch, MagicMock
import os
import json
import requests
from audits.broken_links import audit

class TestBrokenLinksAudit(unittest.TestCase):

    def setUp(self):
        self.base_url = "https://www.localseogen.com"
        self.project_root = os.getcwd() 

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
        self.dummy_html_path = os.path.join(self.project_root, "dummy_test_file.html")
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
    def test_audit_local_file_external_links(self, mock_requests_get, mock_requests_session):
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
            elif url == f"{self.base_url}/internal-link":
                mock_resp.status_code = 200
            elif url == f"{self.base_url}/relative-link.html":
                mock_resp.status_code = 200 # Should be valid for this test
            else:
                raise requests.exceptions.RequestException(f"Unexpected URL in mock_session_get_side_effect: {url}")
            mock_resp.close = MagicMock()
            return mock_resp

        mock_session_instance.get.side_effect = mock_session_get_side_effect

        result = audit([self.dummy_html_path], self.base_url, self.project_root)
        broken_links = result['broken_links']

        # Expect only the broken external link to be reported
        self.assertEqual(len(broken_links), 1)
        self.assertEqual(broken_links[0]['url'], 'https://broken.example.com/broken-link')
        self.assertEqual(broken_links[0]['status_code'], 404)





    @patch('requests.Session')
    @patch('builtins.open', side_effect=IOError("Permission denied"))
    def test_audit_local_file_read_failure(self, mock_open, mock_requests_session):
        result = audit([self.dummy_html_path], self.base_url, self.project_root)
        file_processing_errors = result['file_processing_errors']
        self.assertEqual(len(file_processing_errors), 1)
        self.assertIn('Error processing file: Permission denied', file_processing_errors[0]['error'])


    @patch('requests.Session')
    @patch('requests.get')
    def test_audit_no_links(self, mock_requests_get, mock_requests_session):
        empty_html = "<html><body></body></html>"
        empty_test_file_path = os.path.join(self.project_root, "empty_test_file.html")
        with open(empty_test_file_path, "w", encoding="utf-8") as f:
            f.write(empty_html)

        result = audit([empty_test_file_path], self.base_url, self.project_root)
        broken_links = result['broken_links']
        self.assertEqual(len(broken_links), 0)
        os.remove(empty_test_file_path)



    @patch('requests.Session')
    @patch('requests.get')
    def test_audit_local_file_internal_links(self, mock_requests_get, mock_requests_session):
        # Mock the session.get for internal link checks
        mock_session_instance = MagicMock()
        mock_requests_session.return_value = mock_session_instance

        # Simulate responses for the internal links found in dummy_html_content
        # Resolved based on self.base_url and self.dummy_html_path (which translates to /dummy_test_file.html on base_url)
        def mock_session_get_side_effect(url, **kwargs):
            mock_resp = MagicMock()
            if url == f"{self.base_url}/internal-link":
                mock_resp.status_code = 200
            elif url == f"{self.base_url}/relative-link.html":
                mock_resp.status_code = 404 # Simulate a broken internal link
            elif "example.com/valid-link" in url:
                mock_resp.status_code = 200
            elif "broken.example.com/broken-link" in url:
                mock_resp.status_code = 200 # Should be valid for this test
            elif "protocol-relative.example.com/test" in url:
                mock_resp.status_code = 200
            else:
                raise requests.exceptions.RequestException(f"Unexpected URL in mock_session_get_side_effect: {url}")
            mock_resp.close = MagicMock()
            return mock_resp

        mock_session_instance.get.side_effect = mock_session_get_side_effect

        result = audit([self.dummy_html_path], self.base_url, self.project_root)
        broken_links = result['broken_links']

        # Expect only the broken internal link to be reported
        self.assertEqual(len(broken_links), 1)
        self.assertEqual(broken_links[0]['url'], f"{self.base_url}/relative-link.html")
        self.assertEqual(broken_links[0]['status_code'], 404)

if __name__ == '__main__':
    unittest.main()
