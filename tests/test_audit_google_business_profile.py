import unittest
from unittest.mock import patch, MagicMock
import json
import requests
import os
from audits_v2.google_business_profile import (
    get_business_name,
    check_google_business_profile,
    perform_google_search,
)


class TestAuditGoogleBusinessProfile(unittest.TestCase):

    # Tests for get_business_name
    @patch("audits_v2.google_business_profile.requests.get")
    def test_get_business_name_from_title(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_response.content = (
            b"<html><head><title>My Awesome Business | Homepage</title></head></html>"
        )
        mock_get.return_value = mock_response

        business_name = get_business_name("http://example.com")
        self.assertEqual(business_name, "My Awesome Business")

    @patch("audits_v2.google_business_profile.requests.get")
    def test_get_business_name_from_og_site_name(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_response.content = b'<html><head><meta property="og:site_name" content="My OG Business"></head></html>'
        mock_get.return_value = mock_response

        business_name = get_business_name("http://example.com")
        self.assertEqual(business_name, "My OG Business")

    @patch("audits_v2.google_business_profile.requests.get")
    def test_get_business_name_not_found(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_response.content = b"<html><head></head></html>"
        mock_get.return_value = mock_response

        business_name = get_business_name("http://example.com")
        self.assertIsNone(business_name)

    # Tests for check_google_business_profile using mocked helper functions
    @patch("audits_v2.google_business_profile.get_business_name")
    @patch("audits_v2.google_business_profile.perform_google_search")
    def test_check_google_business_profile_found_via_search(
        self, mock_perform_google_search, mock_get_business_name
    ):
        mock_get_business_name.return_value = "Test Business"
        mock_perform_google_search.return_value = (
            "https://www.google.com/maps/place/Test+Business",
            None,
        )

        result = check_google_business_profile(
            "http://example.com",
            get_business_name_func=mock_get_business_name,
            perform_google_search_func=mock_perform_google_search,
        )
        self.assertTrue(result["has_google_business_profile"])
        self.assertIn(
            "https://www.google.com/maps/place/Test+Business", result["profile_url"]
        )
        self.assertIn("Found Google Business Profile", result["reason"])

    @patch("audits_v2.google_business_profile.get_business_name")
    @patch("audits_v2.google_business_profile.perform_google_search")
    def test_check_google_business_profile_not_found_via_search(
        self, mock_perform_google_search, mock_get_business_name
    ):
        mock_get_business_name.return_value = "Non Existent Business"
        mock_perform_google_search.return_value = (None, None)  # No URL found, no error

        result = check_google_business_profile(
            "http://example.com",
            get_business_name_func=mock_get_business_name,
            perform_google_search_func=mock_perform_google_search,
        )
        self.assertFalse(result["has_google_business_profile"])
        self.assertIsNone(result["profile_url"])
        self.assertIn("No clear Google Business Profile link found", result["reason"])

    @patch("audits_v2.google_business_profile.get_business_name")
    @patch("audits_v2.google_business_profile.perform_google_search")
    def test_perform_google_search_request_error(
        self, mock_perform_google_search, mock_get_business_name
    ):
        mock_get_business_name.return_value = "Test Business"
        mock_perform_google_search.return_value = (
            None,
            "An error occurred while performing Google search: Simulated HTTP Error",
        )

        result = check_google_business_profile(
            "http://example.com",
            get_business_name_func=mock_get_business_name,
            perform_google_search_func=mock_perform_google_search,
        )
        self.assertFalse(result["has_google_business_profile"])
        self.assertIsNone(result["profile_url"])
        self.assertTrue(
            result["reason"].startswith(
                "An error occurred while performing Google search:"
            )
        )

    def test_check_google_business_profile_no_business_name(self):
        result = check_google_business_profile(None)
        self.assertFalse(result["has_google_business_profile"])
        self.assertEqual(
            result["reason"], "Could not determine business name from website."
        )
