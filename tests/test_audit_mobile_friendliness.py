
import unittest
import json
from audit_mobile_friendliness import audit_mobile_friendliness

class TestAuditMobileFriendliness(unittest.TestCase):

    def test_audit_mobile_friendliness(self):
        """
        Tests the audit_mobile_friendliness function with a mock URL.
        """
        url = "https://example.com"
        result = audit_mobile_friendliness(url)
        self.assertTrue(result["is_mobile_friendly"])
        self.assertEqual(result["score"], 95)
        self.assertEqual(result["issues"], [])

    def test_no_url_provided(self):
        """
        Tests the script's behavior when no URL is provided.
        """
        import subprocess
        result = subprocess.run(["python3", "audit_mobile_friendliness.py"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout), {"error": "No URL provided"})

if __name__ == '__main__':
    unittest.main()
