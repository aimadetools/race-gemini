import sys
import os
import unittest
from unittest.mock import patch, MagicMock, call
import json
import requests
import subprocess # Added for subprocess test

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from check_broken_links import check_external_links

class TestCheckBrokenLinks(unittest.TestCase):

    @patch('requests.Session')
    @patch('requests.get')
    def test_valid_url_no_broken_links(self, mock_get_source, mock_session_class):
        mock_response_source = MagicMock(status_code=200, content=b'<html><body><a href="http://example.com/good">Good Link</a></body></html>')
        mock_response_source.raise_for_status.return_value = None
        mock_get_source.return_value = mock_response_source

        mock_session_instance = MagicMock()
        mock_session_instance.get.return_value = MagicMock(status_code=200, close=MagicMock())
        mock_session_class.return_value = mock_session_instance

        result = check_external_links('http://test.com')
        self.assertEqual(result, [])
        mock_get_source.assert_called_once_with('http://test.com', timeout=10)
        mock_session_class.assert_called_once()
        mock_session_instance.get.assert_called_once_with('http://example.com/good', allow_redirects=True, stream=True, timeout=5)

    @patch('requests.Session')
    @patch('requests.get')
    def test_valid_url_with_broken_link(self, mock_get_source, mock_session_class):
        mock_response_source = MagicMock(status_code=200, content=b'<html><body><a href="http://example.com/bad">Bad Link</a></body></html>')
        mock_response_source.raise_for_status.return_value = None
        mock_get_source.return_value = mock_response_source

        mock_session_instance = MagicMock()
        mock_session_instance.get.return_value = MagicMock(status_code=404, close=MagicMock())
        mock_session_class.return_value = mock_session_instance

        result = check_external_links('http://test.com')
        self.assertEqual(result, [{'url': 'http://example.com/bad', 'status_code': 404}])
        mock_get_source.assert_called_once_with('http://test.com', timeout=10)
        mock_session_class.assert_called_once()
        mock_session_instance.get.assert_called_once_with('http://example.com/bad', allow_redirects=True, stream=True, timeout=5)

    @patch('requests.Session')
    @patch('requests.get')
    def test_valid_url_with_protocol_relative_link(self, mock_get_source, mock_session_class):
        mock_response_source = MagicMock(status_code=200, content=b'<html><body><a href="//example.com/relative">Relative Link</a></body></html>')
        mock_response_source.raise_for_status.return_value = None
        mock_get_source.return_value = mock_response_source

        mock_session_instance = MagicMock()
        mock_session_instance.get.return_value = MagicMock(status_code=200, close=MagicMock())
        mock_session_class.return_value = mock_session_instance

        result = check_external_links('http://test.com')
        self.assertEqual(result, [])
        mock_get_source.assert_called_once_with('http://test.com', timeout=10)
        mock_session_class.assert_called_once()
        mock_session_instance.get.assert_called_once_with('https://example.com/relative', allow_redirects=True, stream=True, timeout=5)

    @patch('requests.get')
    def test_source_url_fetch_failure(self, mock_get_source):
        mock_get_source.side_effect = requests.exceptions.RequestException('Network error')

        result = check_external_links('http://test.com')
        self.assertEqual(result, [{'url': 'http://test.com', 'error': 'Failed to fetch URL: Network error'}])
        mock_get_source.assert_called_once_with('http://test.com', timeout=10)

    @patch('os.path.exists', return_value=True)
    @patch('builtins.open', new_callable=unittest.mock.mock_open, read_data='<html><body><a href="http://example.com/good">Good Link</a></body></html>')
    @patch('requests.Session')
    def test_local_file_no_broken_links(self, mock_session_class, mock_open, mock_exists):
        mock_session_instance = MagicMock()
        mock_session_instance.get.return_value = MagicMock(status_code=200, close=MagicMock())
        mock_session_class.return_value = mock_session_instance

        result = check_external_links('local_file.html')
        self.assertEqual(result, [])
        mock_exists.assert_called_once_with('local_file.html')
        mock_open.assert_called_once_with('local_file.html', 'r', encoding='utf-8')
        mock_session_class.assert_called_once()
        mock_session_instance.get.assert_called_once_with('http://example.com/good', allow_redirects=True, stream=True, timeout=5)

    @patch('os.path.exists', return_value=True)
    @patch('builtins.open', new_callable=unittest.mock.mock_open, read_data='<html><body><a href="http://example.com/bad">Bad Link</a></body></html>')
    @patch('requests.Session')
    def test_local_file_with_broken_link(self, mock_session_class, mock_open, mock_exists):
        mock_session_instance = MagicMock()
        mock_session_instance.get.return_value = MagicMock(status_code=404, close=MagicMock())
        mock_session_class.return_value = mock_session_instance

        result = check_external_links('local_file.html')
        self.assertEqual(result, [{'url': 'http://example.com/bad', 'status_code': 404}])
        self.assertIn(call('local_file.html'), mock_exists.call_args_list)
        mock_open.assert_called_once_with('local_file.html', 'r', encoding='utf-8')
        mock_session_class.assert_called_once()
        mock_session_instance.get.assert_called_once_with('http://example.com/bad', allow_redirects=True, stream=True, timeout=5)

    @patch('os.path.exists', return_value=False)
    def test_invalid_source_neither_url_nor_file(self, mock_exists):
        result = check_external_links('invalid_source')
        self.assertEqual(result, [{'source': 'invalid_source', 'error': 'Invalid source: Not a valid URL or existing file path.'}])
        mock_exists.assert_called_once_with('invalid_source')

    @patch('requests.Session')
    @patch('requests.get')
    def test_link_check_connectivity_failure(self, mock_get_source, mock_session_class):
        mock_response_source = MagicMock(status_code=200, content=b'<html><body><a href="http://example.com/timeout">Timeout Link</a></body></html>')
        mock_response_source.raise_for_status.return_value = None
        mock_get_source.return_value = mock_response_source

        mock_session_instance = MagicMock()
        mock_session_instance.get.side_effect = requests.exceptions.RequestException('Connection timeout')
        mock_session_class.return_value = mock_session_instance

        result = check_external_links('http://test.com')
        self.assertEqual(result, [{'url': 'http://example.com/timeout', 'error': 'Failed to connect or timeout: Connection timeout'}])
        mock_get_source.assert_called_once_with('http://test.com', timeout=10)
        mock_session_class.assert_called_once()
        mock_session_instance.get.assert_called_once_with('http://example.com/timeout', allow_redirects=True, stream=True, timeout=5)

    @patch('os.path.exists', return_value=True)
    @patch('builtins.open', side_effect=IOError('File permission denied'))
    def test_local_file_read_failure(self, mock_open, mock_exists):
        result = check_external_links('protected_file.html')
        self.assertEqual(result, [{'file': 'protected_file.html', 'error': 'Failed to read local file: File permission denied'}])
        self.assertIn(call('protected_file.html'), mock_exists.call_args_list)
        mock_open.assert_called_once_with('protected_file.html', 'r', encoding='utf-8')

    @patch('requests.Session')
    @patch('requests.get')
    def test_script_execution_with_venv(self, mock_get, mock_session):
        # This test ensures that the check_broken_links.py script can be executed
        # as a subprocess using the virtual environment's Python interpreter
        # without encountering a ModuleNotFoundError.
        import subprocess
        import os
        import json

        dummy_html_content = b'<html><body><a href="http://example.com/test-subprocess">Test Subprocess Link</a></body></html>'
        dummy_html_path = 'temp_test_script_subprocess.html'
        with open(dummy_html_path, 'wb') as f:
            f.write(dummy_html_content)

        # Mock requests behavior for the subprocess
        mock_session_instance = MagicMock()
        mock_session_instance.get.return_value = MagicMock(status_code=404, close=MagicMock())
        mock_session.return_value = mock_session_instance

        mock_response_source = MagicMock(status_code=200, content=dummy_html_content)
        mock_response_source.raise_for_status.return_value = None
        mock_get.return_value = mock_response_source

        script_path = os.path.abspath('check_broken_links.py')
        venv_python = os.path.abspath('venv/bin/python')

        try:
            result = subprocess.run(
                [venv_python, script_path, dummy_html_path],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertNotIn('ModuleNotFoundError', result.stderr)
            self.assertEqual(result.returncode, 0)

            output_data = json.loads(result.stdout)
            self.assertEqual(output_data, {"broken_links": [{"url": "http://example.com/test-subprocess", "status_code": 404}]})

        finally:
            if os.path.exists(dummy_html_path):
                os.remove(dummy_html_path)

if __name__ == '__main__':
    unittest.main()
