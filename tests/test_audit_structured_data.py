import unittest
from unittest.mock import patch, MagicMock
from audits_v2.structured_data import audit

class TestAuditStructuredData(unittest.TestCase):

    def test_audit_structured_data_found(self):
        html_content = '<html><head><script type="application/ld+json">{"@context": "https://schema.org", "@type": "Person", "name": "John Doe"}</script></head></html>'
        result = audit(html_content, target_type='html_content')
        self.assertEqual(len(result['results']['structured_data_found']), 1)
        self.assertEqual(result['results']['structured_data_found'][0]['name'], "John Doe")
        self.assertEqual(result['issues'], [])

    def test_audit_structured_data_not_found(self):
        html_content = '<html><head></head></html>'
        result = audit(html_content, target_type='html_content')
        self.assertEqual(len(result['results']['structured_data_found']), 0)
        self.assertEqual(len(result['issues']), 1)
        self.assertEqual(result['issues'][0]['type'], 'INFO')

    def test_invalid_json_ld(self):
        html_content = '<html><head><script type="application/ld+json">{"@context": "https://schema.org",,}</script></head></html>'
        result = audit(html_content, target_type='html_content')
        self.assertEqual(len(result['results']['structured_data_found']), 0)
        self.assertEqual(len(result['issues']), 1)
        self.assertEqual(result['issues'][0]['type'], 'ERROR')

if __name__ == '__main__':
    unittest.main()
