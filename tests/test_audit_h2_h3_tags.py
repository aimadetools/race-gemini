import unittest
import json
import os
import subprocess
import sys

# Add the directory containing the audit script to the Python path
sys.path.insert(0, os.path.abspath('.'))
from audit_h2_h3_tags import audit_h2_h3_tags

class TestAuditH2H3Tags(unittest.TestCase):

    def setUp(self):
        # Create a temporary directory for test HTML files
        self.test_dir = "temp_test_html"
        os.makedirs(self.test_dir, exist_ok=True)

    def tearDown(self):
        # Clean up the temporary directory
        for f in os.listdir(self.test_dir):
            os.remove(os.path.join(self.test_dir, f))
        os.rmdir(self.test_dir)

    def _create_html_file(self, filename, content):
        filepath = os.path.join(self.test_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return filepath

    def _run_audit_script(self, filepath):
        # Run the script as a subprocess to get JSON output
        result = subprocess.run(
            [sys.executable, 'audit_h2_h3_tags.py', filepath],
            capture_output=True,
            text=True,
            check=False # Don't raise an exception for non-zero exit codes
        )
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            self.fail(f"Script returned invalid JSON: {result.stdout}")

    def test_correct_h2_h3_structure(self):
        html_content = """
        <!DOCTYPE html>
        <html>
        <head><title>Test Page</title></head>
        <body>
            <h1>Main Title</h1>
            <h2>Section 1</h2>
            <h3>Sub-section 1.1</h3>
            <h2>Section 2</h2>
            <h3>Sub-section 2.1</h3>
            <h3>Sub-section 2.2</h3>
        </body>
        </html>
        """
        filepath = self._create_html_file("correct.html", html_content)
        result = self._run_audit_script(filepath)
        self.assertEqual(result["num_h2_tags"], 2)
        self.assertEqual(result["num_h3_tags"], 3)
        self.assertEqual(len(result["issues"]), 0)
        self.assertIn("Section 1", result["h2_content"])
        self.assertIn("Sub-section 2.2", result["h3_content"])

    def test_empty_h2_tag(self):
        html_content = """
        <!DOCTYPE html>
        <html>
        <body>
            <h1>Title</h1>
            <h2></h2>
            <h3>Sub</h3>
        </body>
        </html>
        """
        filepath = self._create_html_file("empty_h2.html", html_content)
        result = self._run_audit_script(filepath)
        self.assertEqual(result["num_h2_tags"], 1)
        self.assertEqual(result["num_h3_tags"], 1)
        self.assertEqual(len(result["issues"]), 1)
        self.assertEqual(result["issues"][0]["type"], "Empty H2 Tag")

    def test_empty_h3_tag(self):
        html_content = """
        <!DOCTYPE html>
        <html>
        <body>
            <h1>Title</h1>
            <h2>Section</h2>
            <h3></h3>
        </body>
        </html>
        """
        filepath = self._create_html_file("empty_h3.html", html_content)
        result = self._run_audit_script(filepath)
        self.assertEqual(result["num_h2_tags"], 1)
        self.assertEqual(result["num_h3_tags"], 1)
        self.assertEqual(len(result["issues"]), 1)
        self.assertEqual(result["issues"][0]["type"], "Empty H3 Tag")

    def test_h3_before_h2(self):
        html_content = """
        <!DOCTYPE html>
        <html>
        <body>
            <h1>Title</h1>
            <h3>Sub-section 1</h3>
            <h2>Section 1</h2>
        </body>
        </html>
        """
        filepath = self._create_html_file("h3_before_h2.html", html_content)
        result = self._run_audit_script(filepath)
        self.assertEqual(result["num_h2_tags"], 1)
        self.assertEqual(result["num_h3_tags"], 1)
        self.assertEqual(len(result["issues"]), 1)
        self.assertEqual(result["issues"][0]["type"], "H3 Before H2")

    def test_no_h2_h3_tags(self):
        html_content = """
        <!DOCTYPE html>
        <html>
        <body>
            <h1>Only H1</h1>
            <p>Some paragraph text.</p>
        </body>
        </html>
        """
        filepath = self._create_html_file("no_h_tags.html", html_content)
        result = self._run_audit_script(filepath)
        self.assertEqual(result["num_h2_tags"], 0)
        self.assertEqual(result["num_h3_tags"], 0)
        self.assertEqual(len(result["issues"]), 0) # No issues reported for absence, just counts

    def test_multiple_h3_before_h2_only_one_issue(self):
        html_content = """
        <!DOCTYPE html>
        <html>
        <body>
            <h1>Title</h1>
            <h3>Sub-section 1</h3>
            <h3>Sub-section 2</h3>
            <h2>Section 1</h2>
        </body>
        </html>
        """
        filepath = self._create_html_file("multiple_h3_before_h2.html", html_content)
        result = self._run_audit_script(filepath)
        self.assertEqual(result["num_h2_tags"], 1)
        self.assertEqual(result["num_h3_tags"], 2)
        self.assertEqual(len(result["issues"]), 1)
        self.assertEqual(result["issues"][0]["type"], "H3 Before H2")

    def test_no_h1_but_correct_h2_h3(self):
        html_content = """
        <!DOCTYPE html>
        <html>
        <body>
            <h2>Section 1</h2>
            <h3>Sub-section 1.1</h3>
        </body>
        </html>
        """
        filepath = self._create_html_file("no_h1_correct_h2_h3.html", html_content)
        result = self._run_audit_script(filepath)
        self.assertEqual(result["num_h2_tags"], 1)
        self.assertEqual(result["num_h3_tags"], 1)
        self.assertEqual(len(result["issues"]), 0) # No issues for H1 absence here, that's audit_h1_tags.py job

if __name__ == '__main__':
    unittest.main()
