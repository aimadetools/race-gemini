import unittest
from unittest.mock import patch, MagicMock
from audits_v2.mobile_friendliness import audit

class TestAuditMobileFriendliness(unittest.TestCase):

    @patch('requests.get')
    def test_audit_mobile_friendliness_success(self, mock_get):
        # Mock the Google PageSpeed Insights API response for a mobile-friendly site
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "lighthouseResult": {
                "audits": {
                    "viewport": {"score": 1},
                    "tap-targets": {"score": 1},
                    "font-size": {"score": 1}
                }
            }
        }
        mock_get.return_value = mock_response

        # Mock the environment variable
        with patch.dict('os.environ', {'GOOGLE_PAGE_SPEED_API_KEY': 'test_key'}):
            result = audit("https://example.com", target_type='url')

        self.assertTrue(result['results']['is_mobile_friendly'])
        self.assertEqual(result['results']['score'], 100)
        self.assertEqual(result['issues'], [])

    @patch('requests.get')
    def test_audit_mobile_friendliness_failure(self, mock_get):
        # Mock the Google PageSpeed Insights API response for a non-mobile-friendly site
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "lighthouseResult": {
                "audits": {
                    "viewport": {"score": 0},
                    "tap-targets": {"score": 0},
                    "font-size": {"score": 0}
                }
            }
        }
        mock_get.return_value = mock_response

        # Mock the environment variable
        with patch.dict('os.environ', {'GOOGLE_PAGE_SPEED_API_KEY': 'test_key'}):
            result = audit("https://example.com", target_type='url')

        self.assertFalse(result['results']['is_mobile_friendly'])
        self.assertEqual(result['results']['score'], 0)
        self.assertNotEqual(len(result['issues']), 0)

    def test_no_api_key(self):
        # Test the behavior when the API key is not set
        with patch.dict('os.environ', {}, clear=True):
            result = audit("https://example.com", target_type='url')
        
        self.assertEqual(len(result['issues']), 1)
        self.assertEqual(result['issues'][0]['type'], 'API_KEY_MISSING')

if __name__ == '__main__':
    unittest.main()
