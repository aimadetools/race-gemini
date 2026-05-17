import requests
from bs4 import BeautifulSoup


def audit(html_content, file_path):
    """
    Audits HTML content for <img> tags missing alt attributes or having empty alt attributes.
    Returns a list of dictionaries, each describing an issue.
    """
    issues = []
    soup = BeautifulSoup(html_content, "html.parser")
    for img_tag in soup.find_all("img"):
        if not img_tag.has_attr("alt") or not img_tag["alt"].strip():
            issues.append(
                {
                    "type": "Missing or Empty Alt Attribute",
                    "file": file_path,
                    "element": str(img_tag),
                    "src": img_tag.get("src", "N/A"),
                }
            )
    return issues
