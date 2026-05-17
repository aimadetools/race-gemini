from bs4 import BeautifulSoup


def audit(html_content, file_path="N/A"):
    """
    Audits the h1 tags of the given HTML content.
    """
    issues = []
    try:
        soup = BeautifulSoup(html_content, "html.parser")

        h1_tags = soup.find_all("h1")

        if len(h1_tags) > 1:
            issues.append(
                {
                    "type": "Multiple H1 Tags",
                    "description": f"Found {len(h1_tags)} H1 tags in {file_path}. It is generally recommended to have only one H1 tag per page for SEO.",
                    "file": file_path,
                    "h1_content": [h1.get_text(strip=True) for h1 in h1_tags],
                }
            )
        elif len(h1_tags) == 0:
            issues.append(
                {
                    "type": "No H1 Tag Found",
                    "description": f"No H1 tag found in {file_path}. An H1 tag is crucial for SEO to signal the main heading of the page.",
                    "file": file_path,
                }
            )

    except Exception as e:
        issues.append(
            {
                "type": "Processing Error",
                "description": f"An unexpected error occurred while processing {file_path}: {e}",
                "file": file_path,
            }
        )

    return issues
