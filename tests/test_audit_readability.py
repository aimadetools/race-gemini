import unittest
import json
import os
import subprocess
import sys

class TestAuditReadability(unittest.TestCase):

    def setUp(self):
        self.test_dir = "temp_test_html_readability"
        os.makedirs(self.test_dir, exist_ok=True)

    def tearDown(self):
        for f in os.listdir(self.test_dir):
            os.remove(os.path.join(self.test_dir, f))
        os.rmdir(self.test_dir)

    def _create_html_file(self, filename, content):
        filepath = os.path.join(self.test_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return filepath

    def _run_audit_script(self, filepath):
        result = subprocess.run(
            [sys.executable, 'audit_readability.py', filepath],
            capture_output=True,
            text=True,
            check=False
        )
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            self.fail(f"Script returned invalid JSON: {result.stdout}")

    def test_easily_readable_content(self):
        # Example text with high readability
        html_content = """
        <!DOCTYPE html>
        <html>
        <body>
            <article>
                <h1>Easy Read</h1>
                <p>The cat sat on the mat. It was a big cat. The mat was red. Cats like to sit.</p>
                <p>This sentence is very simple. Short words are used. Everyone can understand this.</p>
            </article>
        </body>
        </html>
        """
        filepath = self._create_html_file("easy_read.html", html_content)
        result = self._run_audit_script(filepath)
        self.assertIsNotNone(result["flesch_reading_ease"])
        self.assertIsNotNone(result["flesch_kincaid_grade"])
        self.assertGreaterEqual(result["flesch_reading_ease"], 80) # Very easy to read
        self.assertLessEqual(result["flesch_kincaid_grade"], 5)    # Grade 5 or lower
        self.assertEqual(len(result["issues"]), 0)

    def test_difficult_readable_content(self):
        # Example text with low readability (from a scientific abstract)
        html_content = """
        <!DOCTYPE html>
        <html>
        <body>
            <div class="blog-content">
                <h1>Complex Article</h1>
                <p>The prefrontal cortex plays a pivotal role in executive functions,
                including working memory, decision-making, and cognitive flexibility.
                Disruptions in its intricate neural circuitry are frequently implicated
                in various neuropsychiatric disorders, necessitating comprehensive
                neuroimaging and electrophysiological investigations to elucidate
                underlying pathophysiological mechanisms.</p>
            </div>
        </body>
        </html>
        """
        filepath = self._create_html_file("difficult_read.html", html_content)
        result = self._run_audit_script(filepath)
        self.assertIsNotNone(result["flesch_reading_ease"])
        self.assertIsNotNone(result["flesch_kincaid_grade"])
        self.assertLessEqual(result["flesch_reading_ease"], 30) # Very difficult to read
        self.assertGreaterEqual(result["flesch_kincaid_grade"], 12) # High school or college level
        self.assertEqual(len(result["issues"]), 0)

    def test_no_main_content_container(self):
        html_content = """
        <!DOCTYPE html>
        <html>
        <body>
            <div></div>
            <p></p>
            <!-- Some comments -->
        </body>
        </html>
        """
        filepath = self._create_html_file("no_container.html", html_content)
        result = self._run_audit_script(filepath)
        self.assertIsNone(result["flesch_reading_ease"])
        self.assertIsNone(result["flesch_kincaid_grade"])
        self.assertEqual(len(result["issues"]), 1)
        self.assertEqual(result["issues"][0]["type"], "No Readable Text Found")

    def test_no_readable_text_after_extraction(self):
        html_content = """
        <!DOCTYPE html>
        <html>
        <body>
            <article>
                <script>console.log('hello');</script>
                <style>body { color: red; }</style>
                <!-- This is a comment -->
            </article>
        </body>
        </html>
        """
        filepath = self._create_html_file("no_text.html", html_content)
        result = self._run_audit_script(filepath)
        self.assertIsNone(result["flesch_reading_ease"])
        self.assertIsNone(result["flesch_kincaid_grade"])
        self.assertEqual(len(result["issues"]), 1)
        self.assertEqual(result["issues"][0]["type"], "No Readable Text Found")

    def test_empty_html(self):
        html_content = ""
        filepath = self._create_html_file("empty.html", html_content)
        result = self._run_audit_script(filepath)
        self.assertIsNone(result["flesch_reading_ease"])
        self.assertIsNone(result["flesch_kincaid_grade"])
        self.assertEqual(len(result["issues"]), 1)
        self.assertEqual(result["issues"][0]["type"], "No Main Content Container Found")

    def test_html_with_only_script_style_tags(self):
        html_content = """
        <!DOCTYPE html>
        <html>
        <body>
            <script>alert('xss');</script>
            <style>body { color: red; }</style>
        </body>
        </html>
        """
        filepath = self._create_html_file("only_script_style.html", html_content)
        result = self._run_audit_script(filepath)
        self.assertIsNone(result["flesch_reading_ease"])
        self.assertIsNone(result["flesch_kincaid_grade"])
        self.assertEqual(len(result["issues"]), 1)
        self.assertEqual(result["issues"][0]["type"], "No Readable Text Found")


if __name__ == '__main__':
    unittest.main()
