import unittest
from audits_v2.alt_attributes import audit

class TestAuditAltAttributes(unittest.TestCase):

    def test_no_images(self):
        html_content = "<html><body><h1>Hello</h1></body></html>"
        result = audit(html_content, 'html_content', file_path="test_file.html")
        self.assertEqual(result['issues'], [])

    def test_all_images_have_alt(self):
        html_content = """
        <html>
            <body>
                <img src="img1.png" alt="Description 1">
                <img src="img2.jpg" alt="Description 2">
            </body>
        </html>
        """
        result = audit(html_content, 'html_content', file_path="test_file.html")
        self.assertEqual(result['issues'], [])

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
        result = audit(html_content, 'html_content', file_path="test_file.html")
        issues = result['issues']
        expected_issues = [
            {
                "type": "Missing or Empty Alt Attribute",
                "source": "test_file.html",
                "element": '<img src="img1.png"/>',
                "src": "img1.png"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "source": "test_file.html",
                "element": '<img alt="" src="img2.jpg"/>',
                "src": "img2.jpg"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "source": "test_file.html",
                "element": '<img alt=" " src="img3.gif"/>',
                "src": "img3.gif"
            }
        ]
        # A simple equality check might fail due to the order of attributes in the element string.
        # So we check the length and the content of each issue.
        self.assertEqual(len(issues), len(expected_issues))
        for issue in issues:
            # Remove element for comparison, as it can be inconsistent
            del issue['element']
        for expected_issue in expected_issues:
            del expected_issue['element']
        self.assertCountEqual(issues, expected_issues)


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
        result = audit(html_content, 'html_content', file_path="test_file.html")
        issues = result['issues']
        expected_issues = [
            {
                "type": "Missing or Empty Alt Attribute",
                "source": "test_file.html",
                "element": '<img src="img2.jpg"/>',
                "src": "img2.jpg"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "source": "test_file.html",
                "element": '<img alt=" " src="img3.gif"/>',
                "src": "img3.gif"
            }
        ]
        self.assertEqual(len(issues), len(expected_issues))
        for issue in issues:
            del issue['element']
        for expected_issue in expected_issues:
            del expected_issue['element']
        self.assertCountEqual(issues, expected_issues)


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
        result = audit(html_content, 'html_content', file_path="test_file.html")
        issues = result['issues']
        expected_issues = [
            {
                "type": "Missing or Empty Alt Attribute",
                "source": "test_file.html",
                "element": '<img src="/static/img.png"/>',
                "src": "/static/img.png"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "source": "test_file.html",
                "element": '<img src="http://example.com/logo.jpg"/>',
                "src": "http://example.com/logo.jpg"
            },
            {
                "type": "Missing or Empty Alt Attribute",
                "source": "test_file.html",
                "element": '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="/>',
                "src": "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
            }
        ]
        self.assertEqual(len(issues), len(expected_issues))
        for issue in issues:
            del issue['element']
        for expected_issue in expected_issues:
            del expected_issue['element']
        self.assertCountEqual(issues, expected_issues)

if __name__ == "__main__":
    unittest.main()
