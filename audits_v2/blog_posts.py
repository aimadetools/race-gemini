import re
from bs4 import BeautifulSoup


def _run_blog_post_audit(html_content, source_identifier="N/A", base_domain=None):
    """
    Analyzes a single blog post for SEO and readability metrics based on raw HTML content.
    """
    issues = []

    try:
        soup = BeautifulSoup(html_content, "lxml")

        # 1. Check for meta description and length
        description = soup.find("meta", attrs={"name": "description"})
        if not description:
            issues.append(
                {
                    "type": "ERROR",
                    "message": "Missing meta description.",
                    "source": source_identifier,
                }
            )
        elif not description.get("content"):
            issues.append(
                {
                    "type": "ERROR",
                    "message": "Meta description is empty.",
                    "source": source_identifier,
                }
            )
        else:
            desc_len = len(description.get("content"))
            if not 50 <= desc_len <= 160:
                issues.append(
                    {
                        "type": "WARNING",
                        "message": f"Meta description length is {desc_len} characters (ideal: 50-160).",
                        "source": source_identifier,
                    }
                )

        # 2. Check for a single h1 tag
        h1_tags = soup.find_all("h1")
        if len(h1_tags) == 0:
            issues.append(
                {
                    "type": "ERROR",
                    "message": "Missing h1 tag.",
                    "source": source_identifier,
                }
            )
        elif len(h1_tags) > 1:
            issues.append(
                {
                    "type": "WARNING",
                    "message": f"Found {len(h1_tags)} h1 tags (ideal: 1).",
                    "source": source_identifier,
                }
            )

        # 3. Check for H2/H3 tag hierarchy
        headings = soup.find_all(["h1", "h2", "h3"])
        h1_seen = False
        h2_seen = False
        for heading in headings:
            if heading.name == "h1":
                h1_seen = True
                h2_seen = False  # Reset H2 seen when H1 is encountered, as H2s should be nested under H1
            elif heading.name == "h2":
                if not h1_seen:
                    issues.append(
                        {
                            "type": "WARNING",
                            "message": f"H2 tag '{heading.get_text(strip=True)}' found before any H1 tag.",
                            "source": source_identifier,
                        }
                    )
                h2_seen = True
            elif heading.name == "h3":
                if not h2_seen:
                    issues.append(
                        {
                            "type": "WARNING",
                            "message": f"H3 tag '{heading.get_text(strip=True)}' found before any H2 tag.",
                            "source": source_identifier,
                        }
                    )

        # 4. Check for image alt attributes
        images = soup.find_all("img")
        for i, img in enumerate(images):
            if not img.get("alt") or len(img.get("alt").strip()) == 0:
                issues.append(
                    {
                        "type": "WARNING",
                        "message": f"Image {i+1} is missing an alt attribute.",
                        "source": source_identifier,
                        "element": str(img),
                    }
                )

        # 5. Check for word count
        body_text = soup.get_text()
        word_count = len(re.findall(r"\w+", body_text))
        if word_count < 300:
            issues.append(
                {
                    "type": "WARNING",
                    "message": f"Word count is {word_count} (recommended: >300).",
                    "source": source_identifier,
                }
            )

        # 6. Check for internal and external links
        internal_links_found = False
        external_links_found = False
        for link in soup.find_all("a", href=True):
            href = link.get("href")
            if href.startswith("http://") or href.startswith("https://"):
                if base_domain and base_domain in href:
                    internal_links_found = True
                else:
                    external_links_found = True
            else:  # Relative URLs are internal
                internal_links_found = True

        if not internal_links_found:
            issues.append(
                {
                    "type": "WARNING",
                    "message": "No internal links found in the post.",
                    "source": source_identifier,
                }
            )
        if not external_links_found:
            issues.append(
                {
                    "type": "WARNING",
                    "message": "No external links found in the post.",
                    "source": source_identifier,
                }
            )

        # 7. Check for canonical link
        canonical = soup.find("link", attrs={"rel": "canonical"})
        if not canonical:
            issues.append(
                {
                    "type": "ERROR",
                    "message": "Missing canonical link tag.",
                    "source": source_identifier,
                }
            )
        elif not canonical.get("href"):
            issues.append(
                {
                    "type": "ERROR",
                    "message": "Canonical link is empty.",
                    "source": source_identifier,
                }
            )

    except Exception as e:
        issues.append(
            {
                "type": "ERROR",
                "message": f"An unexpected error occurred during blog post audit: {e}",
                "source": source_identifier,
            }
        )

    return {"audit_type": "blog_posts", "issues": issues}


def audit(target_content, target_type="html_content", **kwargs):
    """
    Performs blog post SEO and readability audit on the given target content.

    Args:
        target_content: The content to audit. Can be an HTML string, a file path, or a URL.
        target_type (str): Specifies the type of target_content ('html_content', 'file_path', or 'url').
        **kwargs: Additional options. 'base_domain' can be passed for link checking.

    Returns:
        dict: Standardized audit results including 'audit_type' and a list of 'issues'.
    """
    import requests  # Imported here as it's only needed for URL fetching

    html_content = ""
    source_identifier = kwargs.get(
        "source_identifier", "N/A"
    )  # Use source_identifier from kwargs if provided, else default

    try:
        if target_type == "html_content":
            html_content = target_content
        elif target_type == "file_path":
            source_identifier = target_content
            with open(target_content, "r", encoding="utf-8") as f:
                html_content = f.read()
        elif target_type == "url":
            source_identifier = target_content
            response = requests.get(target_content, timeout=10)
            response.raise_for_status()
            html_content = response.text
        else:
            return {
                "audit_type": "blog_posts",
                "issues": [
                    {
                        "type": "ERROR",
                        "message": f"Unsupported target_type: {target_type}",
                        "source": source_identifier,
                    }
                ],
            }

        if not html_content:
            return {
                "audit_type": "blog_posts",
                "issues": [
                    {
                        "type": "ERROR",
                        "message": "No HTML content provided or fetched for audit.",
                        "source": source_identifier,
                    }
                ],
            }

        base_domain = kwargs.get("domain")  # Get base_domain from kwargs

        return _run_blog_post_audit(html_content, source_identifier, base_domain)

    except requests.exceptions.RequestException as e:
        return {
            "audit_type": "blog_posts",
            "issues": [
                {
                    "type": "ERROR",
                    "message": f"Failed to fetch URL {source_identifier}: {e}",
                    "source": source_identifier,
                }
            ],
        }
    except IOError as e:
        return {
            "audit_type": "blog_posts",
            "issues": [
                {
                    "type": "ERROR",
                    "message": f"Failed to read file {source_identifier}: {e}",
                    "source": source_identifier,
                }
            ],
        }
    except Exception as e:
        return {
            "audit_type": "blog_posts",
            "issues": [
                {
                    "type": "ERROR",
                    "message": f"An unexpected error occurred during content acquisition: {e}",
                    "source": source_identifier,
                }
            ],
        }
