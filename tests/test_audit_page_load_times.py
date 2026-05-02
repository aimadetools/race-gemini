import unittest
from unittest.mock import patch, MagicMock
import json
import sys
import os
import argparse # ADDED THIS LINE

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from audit_page_load_times import main

class TestAuditPageLoadTimes(unittest.TestCase):

    @patch('audit_page_load_times.pcurl') # Patch the pcurl object within the module being tested
    @patch('builtins.print')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_successful_audit(self, mock_parse_args, mock_print, mock_pcurl):
        mock_parse_args.return_value.url = "http://example.com"
        
        # Mock CurlUptime instance and its get_metrics method
        mock_curl_uptime_instance = MagicMock()
        mock_curl_uptime_instance.get_metrics.return_value = {
            'ttfb': 0.123,
            'total': 0.456,
            'other_metric': 1.23
        }
        mock_pcurl.CurlUptime.return_value = mock_curl_uptime_instance

        main()
        
        mock_pcurl.CurlUptime.assert_called_once_with("http://example.com")
        mock_curl_uptime_instance.get_metrics.assert_called_once()
        
        expected_result = {
            "url": "http://example.com",
            "metrics": {
                "ttfb": 0.123,
                "total_time": 0.456
            }
        }
        mock_print.assert_called_once_with(json.dumps(expected_result, indent=2))

    @patch('audit_page_load_times.pcurl')
    @patch('builtins.print')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_no_metrics_returned(self, mock_parse_args, mock_print, mock_pcurl):
        mock_parse_args.return_value.url = "http://example.com/no-metrics"
        
        mock_curl_uptime_instance = MagicMock()
        mock_curl_uptime_instance.get_metrics.return_value = None # Simulate no metrics
        mock_pcurl.CurlUptime.return_value = mock_curl_uptime_instance

        main()
        
        mock_pcurl.CurlUptime.assert_called_once_with("http://example.com/no-metrics")
        mock_curl_uptime_instance.get_metrics.assert_called_once()
        
        expected_result = {"error": "No metrics returned for URL: http://example.com/no-metrics"}
        mock_print.assert_called_once_with(json.dumps(expected_result, indent=2))

    @patch('audit_page_load_times.pcurl')
    @patch('builtins.print')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_error_during_audit(self, mock_parse_args, mock_print, mock_pcurl):
        mock_parse_args.return_value.url = "http://example.com/error"
        
        mock_curl_uptime_instance = MagicMock()
        mock_curl_uptime_instance.get_metrics.side_effect = Exception("Simulated audit error")
        mock_pcurl.CurlUptime.return_value = mock_curl_uptime_instance

        main()
        
        mock_pcurl.CurlUptime.assert_called_once_with("http://example.com/error")
        mock_curl_uptime_instance.get_metrics.assert_called_once()
        
        expected_result = {"error": "An error occurred while auditing http://example.com/error: Simulated audit error"}
        mock_print.assert_called_once_with(json.dumps(expected_result, indent=2))

    @patch('builtins.print')
    @patch('argparse.ArgumentParser.parse_args')
    def test_main_argparse_error_no_url(self, mock_parse_args, mock_print):
        # argparse handles this by exiting. We can simulate this or test that
        # the main function would correctly handle the 'url' not being present
        # if it somehow continued. For a real argparse error, it usually calls sys.exit.
        # Here we'll test the path if parse_args somehow returns an object without url,
        # or if the script is invoked in a way that argparse doesn't prevent its execution
        # without 'url'. Given the original script, this case is mostly handled by argparse itself.
        # This test ensures we don't crash if 'url' is unexpectedly missing from args object.
        mock_parse_args.return_value = MagicMock(spec=argparse.Namespace, url=None)
        
        # We expect it to try to audit a None URL, which will likely cause an internal error
        # or be caught by the outer try-except. Let's make it hit the generic exception.
        # To make it hit the generic exception, we'd need to mock pcurl to raise an error
        # when called with None, or ensure the test target doesn't crash before that.
        # For simplicity, we'll assert that it tries to create CurlUptime with None.
        
        # A more robust test would explicitly patch sys.exit if argparse were to error out.
        # Since the actual script would exit, we just ensure our try-except handles it.
        try:
            main()
        except Exception as e:
            # We expect an error, but argparse usually exits.
            # This test mainly ensures no unhandled exceptions.
            pass
        
        # As argparse handles missing arguments by printing usage and exiting,
        # reaching here with parse_args returning url=None is an edge case.
        # The main function itself would then encounter an error in pcurl.CurlUptime(args.url)
        # if args.url is None. We are testing this path.
        mock_print.assert_called_once_with(json.dumps({"error": "An error occurred while auditing None: unsetopt() is not supported for this option"}, indent=2))


if __name__ == "__main__":
    unittest.main()
