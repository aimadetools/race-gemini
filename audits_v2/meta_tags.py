import requests
from bs4 import BeautifulSoup


def audit(target_url):
    """
    Performs an audit for page titles and meta descriptions on the given target URL.

    Args:
        target_url (str): The URL of the page to audit.

    Returns:
        dict: Standardized audit results including 'audit_type' and a list of 'issues'.
    """
    issues = []
    audit_type = "meta_tags"

    try:
        response = requests.get(target_url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        # Audit Page Title
        title_tag = soup.find("title")
        if not title_tag or not title_tag.string or not title_tag.string.strip():
            issues.append(
                {
                    "type": "Missing Title Tag",
                    "description": f"The page {target_url} is missing a <title> tag or it is empty. A unique and descriptive title is crucial for SEO.",
                    "url": target_url,
                }
            )
        else:
            title_text = title_tag.string.strip()
            if len(title_text) < 30:
                issues.append(
                    {
                        "type": "Short Title Tag",
                        "description": f"The page title is too short ({len(title_text)} characters). Consider making it more descriptive (recommended 30-60 characters). Title: '{title_text}'",
                        "url": target_url,
                        "length": len(title_text),
                        "element": title_text,
                    }
                )
            elif len(title_text) > 60:
                issues.append(
                    {
                        "type": "Long Title Tag",
                        "description": f"The page title is too long ({len(title_text)} characters). Titles longer than 60 characters might be truncated in search results. Title: '{title_text}'",
                        "url": target_url,
                        "length": len(title_text),
                        "element": title_text,
                    }
                )

        # Audit Meta Description
        meta_description_tag = soup.find("meta", attrs={"name": "description"})
        if (
            not meta_description_tag
            or not meta_description_tag.get("content")
            or not meta_description_tag.get("content").strip()
        ):
            issues.append(
                {
                    "type": "Missing Meta Description",
                    "description": f"The page {target_url} is missing a meta description. A compelling meta description can improve click-through rates from search results.",
                    "url": target_url,
                }
            )
        else:
            meta_description_text = meta_description_tag.get("content").strip()
            if len(meta_description_text) < 50:
                issues.append(
                    {
                        "type": "Short Meta Description",
                        "description": f"The meta description is too short ({len(meta_description_text)} characters). Consider making it more descriptive (recommended 50-160 characters). Description: '{meta_description_text}'",
                        "url": target_url,
                        "length": len(meta_description_text),
                        "element": meta_description_text,
                    }
                )
            elif len(meta_description_text) > 160:
                issues.append(
                    {
                        "type": "Long Meta Description",
                        "description": f"The meta description is too long ({len(meta_description_text)} characters). Descriptions longer than 160 characters might be truncated in search results. Description: '{meta_description_text}'",
                        "url": target_url,
                        "length": len(meta_description_text),
                        "element": meta_description_text,
                    }
                )

    except requests.exceptions.RequestException as e:
        issues.append(
            {
                "type": "Network Error",
                "description": f"Failed to fetch URL {target_url}: {e}",
                "url": target_url,
            }
        )
    except Exception as e:
        issues.append(
            {
                "type": "Processing Error",
                "description": f"An unexpected error occurred during meta tags audit for {target_url}: {e}",
                "url": target_url,
            }
        )

    return {"audit_type": audit_type, "issues": issues}
