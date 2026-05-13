import unittest
from unittest.mock import patch, MagicMock
import json
import requests
from audits_v2.alt_attributes import audit
import os
import shutil

class TestAuditAltAttributes(unittest.TestCase):

    # --- Tests for audit_alt_attributes function ---

    def test_no_images(self):
        html_content = "<html><body><h1>Hello</h1></body></html>"
        issues = audit(html_content, 'html_content', file_path="test_file.html")
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
        issues = audit(html_content, 'html_content', file_path="test_file.html")
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
        issues = audit(html_content, 'html_content', file_path="test_file.html")
        expected_issues = [
            {
                "type": "Missing or Empty Alt Attribute",
                "file": "test_file.html",
                "element": '<img src="img1.png"/>',
                "src": "img1.png"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "file": "test_file.html",
                "element": '<img alt="" src="img2.jpg"/>',
                "src": "img2.jpg"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "file": "test_file.html",
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
        issues = audit(html_content, 'html_content', file_path="test_file.html")
        expected_issues = [
            {
                "type": "Missing or Empty Alt Attribute",
                "file": "test_file.html",
                "element": '<img src="img2.jpg"/>',
                "src": "img2.jpg"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "file": "test_file.html",
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
        issues = audit(html_content, 'html_content', file_path="test_file.html")
        expected_issues = [
            {
                "type": "Missing or Empty Alt Attribute",
                "file": "test_file.html",
                "element": '<img src="/static/img.png"/>',
                "src": "/static/img.png"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "file": "test_file.html",
                "element": '<img src="http://example.com/logo.jpg"/>',
                "src": "http://example.com/logo.jpg"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "file": "test_file.html",
                "element": '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="/>',
                "src": "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
            }
        ]
        self.assertEqual(issues, expected_issues)


#    def setUp(self):
#        # Create a temporary directory for test HTML files
#        self.test_dir = "temp_test_html_alt"
#        os.makedirs(self.test_dir, exist_ok=True)
#
#    def tearDown(self):
#        # Clean up the temporary directory
#        if os.path.exists(self.test_dir):
#            shutil.rmtree(self.test_dir)
#
#    def _create_html_file(self, filename, content):
#        filepath = os.path.join(self.test_dir, filename)
#        with open(filepath, 'w', encoding='utf-8') as f:
#            f.write(content)
#        return filepath
#
#    @patch('builtins.print')
#    def test_main_no_issues_local_files(self, mock_print):
#        with patch('sys.argv', ['audit_alt_attributes.py', '--dir', self.test_dir]):
#            self._create_html_file("good1.html", "<html><body><img src='img1.png' alt='Good Alt'></body></html>")
#            self._create_html_file("good2.html", "<html><body><img src='img2.jpg' alt='Another Good Alt'></body></html>")
#
#            with self.assertRaises(SystemExit) as cm:
#                main()
#            self.assertEqual(cm.exception.code, 0)
#            printed_output = mock_print.call_args[0][0]
#            self.assertEqual(json.loads(printed_output), {"message": "No issues found."})
#
#    @patch('builtins.print')
#    def test_main_with_issues_local_files(self, mock_print):
#        with patch('sys.argv', ['audit_alt_attributes.py', '--dir', self.test_dir]):
#            self._create_html_file("bad1.html", "<html><body><img src='img1.png'></body></html>")
#            self._create_html_file("bad2.html", "<html><body><img src='img2.jpg' alt=' '></body></html>")
#
#            with self.assertRaises(SystemExit) as cm:
#                main()
#            self.assertEqual(cm.exception.code, 1)
#            printed_output = mock_print.call_args[0][0]
#            issues = json.loads(printed_output)
#
#            self.assertEqual(len(issues), 2)
#
#    @patch('builtins.print')
#    def test_main_no_html_files(self, mock_print):
#        with patch('sys.argv', ['audit_alt_attributes.py', '--dir', self.test_dir]):
#            with self.assertRaises(SystemExit) as cm:
#                main()
#            self.assertEqual(cm.exception.code, 0)
#            mock_print.assert_called_once_with(json.dumps({"message": "No issues found."}))
#
#    @patch('builtins.print')
#    def test_main_file_processing_error(self, mock_print):
#        with patch('sys.argv', ['audit_alt_attributes.py', '--dir', self.test_dir]):
#            self._create_html_file("error.html", "this is not valid html, and will cause an exception if audit_alt_attributes is strict")
#
#            with patch('audit_alt_attributes.audit_alt_attributes', side_effect=Exception("Simulated processing error")):
#                with self.assertRaises(SystemExit) as cm:
#                    main()
#                self.assertEqual(cm.exception.code, 1)
#                printed_output = mock_print.call_args[0][0]
#                error_output = json.loads(printed_output)
#                self.assertEqual(len(error_output), 1)
#                self.assertIn("error", error_output[0])
#                self.assertIn("Simulated processing error", error_output[0]["error"])
#
#    @patch('requests.get')
#    @patch('builtins.print')
#    def test_main_url_no_issues(self, mock_print, mock_get):
#        with patch('sys.argv', ['audit_alt_attributes.py', '--url', 'http://example.com']):
#            mock_get.return_value.status_code = 200
#            mock_get.return_value.text = "<html><body><img src='img1.png' alt='Good Alt'></body></html>"
#            with self.assertRaises(SystemExit) as cm:
#                main()
#            self.assertEqual(cm.exception.code, 0)
#            printed_output = mock_print.call_args[0][0]
#            self.assertEqual(json.loads(printed_output), {"message": "No issues found."})
#
#    @patch('requests.get')
#    @patch('builtins.print')
#    def test_main_url_with_issues(self, mock_print, mock_get):
#        with patch('sys.argv', ['audit_alt_attributes.py', '--url', 'http://example.com']):
#            mock_get.return_value.status_code = 200
#            mock_get.return_value.text = "<html><body><img src='img1.png'></body></html>"
#            with self.assertRaises(SystemExit) as cm:
#                main()
#            self.assertEqual(cm.exception.code, 1)
#            printed_output = mock_print.call_args[0][0]
#            issues = json.loads(printed_output)
#            self.assertEqual(len(issues), 1)
#
#if __name__ == "__main__":
#    unittest.main()
