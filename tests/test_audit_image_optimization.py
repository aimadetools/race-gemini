import unittest
from unittest.mock import patch, MagicMock
from audits_v2.image_optimization import ImageOptimizationAudit
import requests


class TestImageOptimizationAudit(unittest.TestCase):

    def setUp(self):
        self.test_url = "http://example.com"
        self.audit_instance = ImageOptimizationAudit(self.test_url)

    @patch("requests.get")
    @patch("requests.head")
    def test_no_images_found(self, mock_head, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = "<html><body><h1>Hello</h1></body></html>"

        findings = self.audit_instance.run_audit()
        self.assertIn("No <img> tags found on the page.", findings)
        mock_head.assert_not_called()

    @patch("requests.get")
    @patch("requests.head")
    def test_all_images_optimized(self, mock_head, mock_get):
        html_content = """
        <html>
            <body>
                <img src="img1.webp" alt="Description 1">
                <img src="img2.svg" alt="Description 2">
            </body>
        </html>
        """
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = html_content

        mock_head.return_value.status_code = 200
        mock_head.return_value.headers = {"Content-Length": "50000"}  # 50KB

        findings = self.audit_instance.run_audit()
        self.assertEqual(len(findings), 0)
        self.assertEqual(mock_head.call_count, 2)  # Should call head for each image

    @patch("requests.get")
    @patch("requests.head")
    def test_image_missing_alt_attribute(self, mock_head, mock_get):
        html_content = """
        <html>
            <body>
                <img src="img1.webp">
            </body>
        </html>
        """
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = html_content

        mock_head.return_value.status_code = 200
        mock_head.return_value.headers = {"Content-Length": "50000"}  # 50KB

        findings = self.audit_instance.run_audit()
        self.assertIn(
            "Missing or empty 'alt' attribute for image: http://example.com/img1.webp",
            findings,
        )
        self.assertEqual(mock_head.call_count, 1)

    @patch("requests.get")
    @patch("requests.head")
    def test_image_suggest_modern_format(self, mock_head, mock_get):
        html_content = """
        <html>
            <body>
                <img src="img1.jpg" alt="Description 1">
            </body>
        </html>
        """
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = html_content

        mock_head.return_value.status_code = 200
        mock_head.return_value.headers = {"Content-Length": "50000"}  # 50KB

        findings = self.audit_instance.run_audit()
        self.assertIn(
            "Consider using modern image formats (like WebP) for image: http://example.com/img1.jpg",
            findings,
        )
        self.assertEqual(mock_head.call_count, 1)

    @patch("requests.get")
    @patch("requests.head")
    def test_image_large_file_size(self, mock_head, mock_get):
        html_content = """
        <html>
            <body>
                <img src="img1.webp" alt="Description 1">
            </body>
        </html>
        """
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = html_content

        mock_head.return_value.status_code = 200
        mock_head.return_value.headers = {
            "Content-Length": "150000"
        }  # 150KB, over 100KB threshold

        findings = self.audit_instance.run_audit()
        self.assertIn(
            "Image is large (146.48 KB > 100 KB): http://example.com/img1.webp",
            findings,
        )
        self.assertEqual(mock_head.call_count, 1)

    @patch("requests.get")
    @patch("requests.head")
    def test_image_large_file_size_with_multiple_images(self, mock_head, mock_get):
        html_content = """
        <html>
            <body>
                <img src="img1.webp" alt="Description 1">
                <img src="img2.jpg" alt="Description 2">
            </body>
        </html>
        """
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = html_content

        # Mock responses for head requests
        mock_head.side_effect = [
            MagicMock(
                status_code=200, headers={"Content-Length": "150000"}
            ),  # img1.webp (large)
            MagicMock(
                status_code=200, headers={"Content-Length": "50000"}
            ),  # img2.jpg (small)
        ]

        findings = self.audit_instance.run_audit()
        self.assertIn(
            "Image is large (146.48 KB > 100 KB): http://example.com/img1.webp",
            findings,
        )
        # We also expect the modern format suggestion for img2.jpg
        self.assertIn(
            "Consider using modern image formats (like WebP) for image: http://example.com/img2.jpg",
            findings,
        )
        self.assertEqual(mock_head.call_count, 2)
        self.assertEqual(len(findings), 2)  # 1 large image + 1 modern format suggestion

    @patch("requests.get")
    @patch("requests.head")
    def test_image_head_request_failure(self, mock_head, mock_get):
        html_content = """
        <html>
            <body>
                <img src="img1.webp" alt="Description 1">
            </body>
        </html>
        """
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = html_content

        mock_head.side_effect = requests.exceptions.RequestException("Connection error")

        findings = self.audit_instance.run_audit()
        self.assertIn(
            "Could not check size for image http://example.com/img1.webp: Connection error",
            findings,
        )
        self.assertEqual(mock_head.call_count, 1)

    @patch("requests.get")
    @patch("requests.head")
    def test_image_no_content_length_header(self, mock_head, mock_get):
        html_content = """
        <html>
            <body>
                <img src="img1.webp" alt="Description 1">
            </body>
        </html>
        """
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = html_content

        mock_head.return_value.status_code = 200
        mock_head.return_value.headers = {}  # No Content-Length header

        findings = self.audit_instance.run_audit()
        self.assertIn(
            "Could not determine size for image (no Content-Length header): http://example.com/img1.webp",
            findings,
        )
        self.assertEqual(mock_head.call_count, 1)

    @patch("requests.get")
    @patch("requests.head")
    def test_url_fetch_failure(self, mock_head, mock_get):
        mock_get.side_effect = requests.exceptions.RequestException("Network is down")

        findings = self.audit_instance.run_audit()
        self.assertIn(
            "Error fetching URL http://example.com: Network is down", findings
        )
        mock_head.assert_not_called()

    @patch("requests.get")
    @patch("requests.head")
    def test_relative_image_src(self, mock_head, mock_get):
        html_content = """
        <html>
            <body>
                <img src="/static/image.jpg" alt="Relative Image">
            </body>
        </html>
        """
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = html_content

        mock_head.return_value.status_code = 200
        mock_head.return_value.headers = {"Content-Length": "150000"}  # Large image

        findings = self.audit_instance.run_audit()
        self.assertIn(
            "Image is large (146.48 KB > 100 KB): http://example.com/static/image.jpg",
            findings,
        )
        self.assertIn(
            "Consider using modern image formats (like WebP) for image: http://example.com/static/image.jpg",
            findings,
        )
        self.assertEqual(len(findings), 2)  # Only 2 findings expected


if __name__ == "__main__":
    unittest.main()
