import unittest
from audits_v2.readability import audit

class TestAuditReadability(unittest.TestCase):

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
        result = audit(html_content, 'html_content')
        self.assertIsNotNone(result['results']["flesch_reading_ease"])
        self.assertIsNotNone(result['results']["flesch_kincaid_grade"])
        self.assertGreaterEqual(result['results']["flesch_reading_ease"], 80) # Very easy to read
        self.assertLessEqual(result['results']["flesch_kincaid_grade"], 5)    # Grade 5 or lower
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
        result = audit(html_content, 'html_content')
        self.assertIsNotNone(result['results']["flesch_reading_ease"])
        self.assertIsNotNone(result['results']["flesch_kincaid_grade"])
        self.assertLessEqual(result['results']["flesch_reading_ease"], 30) # Very difficult to read
        self.assertGreaterEqual(result['results']["flesch_kincaid_grade"], 12) # High school or college level
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
        result = audit(html_content, 'html_content')
        self.assertIsNone(result['results']["flesch_reading_ease"])
        self.assertIsNone(result['results']["flesch_kincaid_grade"])
        self.assertEqual(len(result["issues"]), 1)
        self.assertEqual(result["issues"][0]["type"], "WARNING")

if __name__ == '__main__':
    unittest.main()
