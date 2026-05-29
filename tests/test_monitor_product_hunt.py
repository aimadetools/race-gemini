import unittest
import sys
import os
from datetime import datetime

# Add the root directory to the python path to allow importing from scripts
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scripts.monitor_product_hunt import analyze_comment, generate_report

class TestMonitorProductHunt(unittest.TestCase):
    def test_analyze_comment_white_label(self):
        comments = [
            "Is there white-label branding support?",
            "I want to resell this with my brand",
            "Can agency users reskin the dashboard?"
        ]
        for c in comments:
            self.assertEqual(analyze_comment(c), "white_label")

    def test_analyze_comment_geocoding(self):
        comments = [
            "How does geocoding work?",
            "How do you get the coordinates?",
            "Fallback map integration"
        ]
        for c in comments:
            self.assertEqual(analyze_comment(c), "geocoding")

    def test_analyze_comment_sitemap(self):
        comments = [
            "Do you generate a sitemap?",
            "How do we index our pages?",
            "Google indexing submission",
            "Bing sitemap crawl"
        ]
        for c in comments:
            self.assertEqual(analyze_comment(c), "sitemap")

    def test_analyze_comment_pricing(self):
        comments = [
            "What is the price?",
            "Are there custom volume discounts?",
            "Credit packs cost too much"
        ]
        for c in comments:
            self.assertEqual(analyze_comment(c), "pricing")

    def test_analyze_comment_generic(self):
        comments = [
            "Great launch!",
            "Congrats!",
            "This is amazing, good luck!",
            "Looks cool"
        ]
        for c in comments:
            self.assertEqual(analyze_comment(c), "generic")

    def test_generate_report(self):
        data = {
            "upvotes": 100,
            "comments": [
                {
                    "author": "Alice",
                    "content": "Is there a white-label version?",
                    "timestamp": "5m ago",
                    "replied": False
                }
            ],
            "scraped_at": "2026-05-29 12:00:00 UTC"
        }
        report = generate_report(data, mock_used=True)
        self.assertIn("# Product Hunt Launch Engagement Report", report)
        self.assertIn("- **Total Upvotes:** 100", report)
        self.assertIn("- **Total Comments:** 1", report)
        self.assertIn("Alice", report)
        self.assertIn("Hi Sarah! Yes, we have robust white-label branding support", report)

if __name__ == "__main__":
    unittest.main()
