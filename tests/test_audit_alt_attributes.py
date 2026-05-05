import unittest
from unittest.mock import patch, MagicMock
import json
import requests
from audit_alt_attributes import audit_alt_attributes, main
import os
import shutil

class TestAuditAltAttributes(unittest.TestCase):

    # --- Tests for audit_alt_attributes function ---

    def test_no_images(self):
        html_content = "<html><body><h1>Hello</h1></body></html>"
        issues = audit_alt_attributes(html_content, "test_file.html")
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
        issues = audit_alt_attributes(html_content, "test_file.html")
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
        issues = audit_alt_attributes(html_content, "test_file.html")
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
        issues = audit_alt_attributes(html_content, "test_file.html")
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
        issues = audit_alt_attributes(html_content, "test_file.html")
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


    # --- Tests for main function ---

    def setUp(self):
        # Create a temporary directory for test HTML files
        self.test_dir = "temp_test_html_alt"
        os.makedirs(self.test_dir, exist_ok=True)

    def tearDown(self):
        # Clean up the temporary directory
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def _create_html_file(self, filename, content):
        filepath = os.path.join(self.test_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return filepath

    @patch('builtins.print')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_no_issues_local_files(self, mock_parse_args, mock_print):
        mock_parse_args.return_value.dir_path = self.test_dir
        
        self._create_html_file("good1.html", "<html><body><img src='img1.png' alt='Good Alt'></body></html>")
        self._create_html_file("good2.html", "<html><body><img src='img2.jpg' alt='Another Good Alt'></body></html>")

        main()
        # Capture the printed output and parse it as JSON
        printed_output = mock_print.call_args[0][0]
        self.assertEqual(json.loads(printed_output), {"message": "No issues found."})

    @patch('builtins.print')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_with_issues_local_files(self, mock_parse_args, mock_print):
        mock_parse_args.return_value.dir_path = self.test_dir
        
        self._create_html_file("bad1.html", "<html><body><img src='img1.png'></body></html>")
        self._create_html_file("bad2.html", "<html><body><img src='img2.jpg' alt=' '></body></html>")

        main()
        printed_output = mock_print.call_args[0][0]
        issues = json.loads(printed_output)

        self.assertEqual(len(issues), 2)
        self.assertIn({
            "type": "Missing or Empty Alt Attribute",
            "file": os.path.join(self.test_dir, "bad1.html"),
            "element": '<img src="img1.png"/>',
            "src": "img1.png"
        }, issues)
        self.assertIn({
            "type": "Missing or Empty Alt Attribute",
            "file": os.path.join(self.test_dir, "bad2.html"),
            "element": '<img alt=" " src="img2.jpg"/>',
            "src": "img2.jpg"
        }, issues)

    @patch('builtins.print')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_no_html_files(self, mock_parse_args, mock_print):
        mock_parse_args.return_value.dir_path = self.test_dir
        # No HTML files created in self.test_dir

        main()
        mock_print.assert_called_once_with(json.dumps({"message": f"No HTML files found in the directory: {self.test_dir}"}, indent=2))

    @patch('builtins.print')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_file_processing_error(self, mock_parse_args, mock_print):
        mock_parse_args.return_value.dir_path = self.test_dir
        
        # Create a file that will cause an error (e.g., malformed encoding, but for simplicity, we'll just mock open for now)
        # For a real scenario, you'd create a file that's hard to parse or mock the file reading
        self._create_html_file("error.html", "this is not valid html, and will cause an exception if audit_alt_attributes is strict")

        # To properly test file processing error, we need to mock open or the audit_alt_attributes function
        # Here we'll rely on the exception handling in main if audit_alt_attributes were to raise one.
        # However, audit_alt_attributes expects valid html content and will parse what it gets.
        # A more direct test would be to mock audit_alt_attributes to raise an exception.
        with patch('audit_alt_attributes.audit_alt_attributes', side_effect=Exception("Simulated processing error")):
            main()
            printed_output = mock_print.call_args[0][0]
            error_output = json.loads(printed_output)
            self.assertEqual(len(error_output), 1)
            self.assertIn("error", error_output[0])
            self.assertIn("Simulated processing error", error_output[0]["error"])

if __name__ == "__main__":
    unittest.main()
