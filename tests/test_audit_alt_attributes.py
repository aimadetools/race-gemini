import unittest
from unittest.mock import patch, MagicMock
import json
import requests
from audit_alt_attributes import audit_alt_attributes, main

class TestAuditAltAttributes(unittest.TestCase):

    # --- Tests for audit_alt_attributes function ---

    def test_no_images(self):
        html_content = "<html><body><h1>Hello</h1></body></html>"
        issues = audit_alt_attributes(html_content)
        self.assertEqual(issues, [])

    def test_all_images_have_alt(self):
        html_content = """
        <html>
            <body>
                <img src="img1.png" alt="Description 1">
                <img src="img2.jpg" alt="Description 2">
            </body>
        </html>
        """
        issues = audit_alt_attributes(html_content)
        self.assertEqual(issues, [])

    def test_images_missing_alt(self):
        html_content = """
        <html>
            <body>
                <img src="img1.png">
                <img src="img2.jpg" alt="">
                <img src="img3.gif" alt=" ">
            </body>
        </html>
        """
        issues = audit_alt_attributes(html_content)
        expected_issues = [
            {
                "type": "Missing or Empty Alt Attribute",
                "element": '<img src="img1.png"/>',
                "src": "img1.png"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "element": '<img alt="" src="img2.jpg"/>',
                "src": "img2.jpg"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "element": '<img alt=" " src="img3.gif"/>',
                "src": "img3.gif"
            }
        ]
        self.assertEqual(issues, expected_issues)

    def test_mixed_images(self):
        html_content = """
        <html>
            <body>
                <img src="img1.png" alt="Good Alt">
                <img src="img2.jpg">
                <img src="img3.gif" alt=" ">
            </body>
        </html>
        """
        issues = audit_alt_attributes(html_content)
        expected_issues = [
            {
                "type": "Missing or Empty Alt Attribute",
                "element": '<img src="img2.jpg"/>',
                "src": "img2.jpg"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "element": '<img alt=" " src="img3.gif"/>',
                "src": "img3.gif"
            }
        ]
        self.assertEqual(issues, expected_issues)

    def test_different_src_attributes(self):
        html_content = """
        <html>
            <body>
                <img src="/static/img.png">
                <img src="http://example.com/logo.jpg">
                <img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==">
            </body>
        </html>
        """
        issues = audit_alt_attributes(html_content)
        expected_issues = [
            {
                "type": "Missing or Empty Alt Attribute",
                "element": '<img src="/static/img.png"/>',
                "src": "/static/img.png"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "element": '<img src="http://example.com/logo.jpg"/>',
                "src": "http://example.com/logo.jpg"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "element": '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="/>',
                "src": "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
            }
        ]
        self.assertEqual(issues, expected_issues)


    # --- Tests for main function ---

    @patch('requests.get')
    @patch('builtins.print')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_successful_audit_no_issues(self, mock_parse_args, mock_print, mock_requests_get):
        mock_parse_args.return_value.url = "http://example.com/no-issues"
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "<html><body><img src='good.png' alt='Good Alt'></body></html>"
        mock_response.raise_for_status.return_value = None
        mock_requests_get.return_value = mock_response

        main()
        mock_requests_get.assert_called_once_with("http://example.com/no-issues")
        mock_print.assert_called_once_with(json.dumps([], indent=2))

    @patch('requests.get')
    @patch('builtins.print')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_successful_audit_with_issues(self, mock_parse_args, mock_print, mock_requests_get):
        mock_parse_args.return_value.url = "http://example.com/with-issues"
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "<html><body><img src='bad.png'></body></html>"
        mock_response.raise_for_status.return_value = None
        mock_requests_get.return_value = mock_response

        main()
        mock_requests_get.assert_called_once_with("http://example.com/with-issues")
        expected_issues = [{"type": "Missing or Empty Alt Attribute", "element": '<img src="bad.png"/>', "src": "bad.png"}]
        mock_print.assert_called_once_with(json.dumps(expected_issues, indent=2))

    @patch('requests.get')
    @patch('builtins.print')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_url_fetch_failure(self, mock_parse_args, mock_print, mock_requests_get):
        mock_parse_args.return_value.url = "http://invalid.com"
        mock_requests_get.side_effect = requests.exceptions.RequestException("DNS lookup failed")

        main()
        mock_requests_get.assert_called_once_with("http://invalid.com")
        mock_print.assert_called_once_with(json.dumps({"error": "Failed to fetch URL http://invalid.com: DNS lookup failed"}, indent=2))

    @patch('requests.get')
    @patch('builtins.print')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_unexpected_error(self, mock_parse_args, mock_print, mock_requests_get):
        mock_parse_args.return_value.url = "http://example.com/error"
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "<html><body><img src='bad.png'></body></html>"
        mock_response.raise_for_status.side_effect = Exception("Arbitrary error") # Simulate error after fetch
        mock_requests_get.return_value = mock_response

        main()
        mock_requests_get.assert_called_once_with("http://example.com/error")
        mock_print.assert_called_once_with(json.dumps({"error": "An unexpected error occurred: Arbitrary error"}, indent=2))


if __name__ == "__main__":
    unittest.main()
