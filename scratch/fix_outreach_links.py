import os
import re

def main():
    emails_file = "generated_outreach_emails.txt"
    sample_pages_dir = "sample-pages"
    
    if not os.path.exists(emails_file):
        print(f"Error: {emails_file} not found.")
        return

    # Load all files in sample-pages
    sample_files = set(os.listdir(sample_pages_dir))
    print(f"Loaded {len(sample_files)} sample pages.")

    with open(emails_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Regex to find the incorrect URLs
    # Format: https://www.localseogen.com/generated-seo-pages/{service_slug}-in-{city_slug}-{business_slug}.html
    url_pattern = r"https://www\.localseogen\.com/generated-seo-pages/([a-zA-Z0-9-]+)-in-([a-zA-Z0-9-]+)-([a-zA-Z0-9-]+)\.html"
    
    matches = re.findall(url_pattern, content)
    print(f"Found {len(matches)} URL matches.")

    replaced_count = 0
    warnings_count = 0

    def replace_url(match):
        nonlocal replaced_count, warnings_count
        full_match = match.group(0)
        service_slug = match.group(1)
        city_slug = match.group(2)
        business_slug = match.group(3)

        # Expected filename format in sample-pages:
        # {business_slug}-{city_slug}-{service_slug}-page-1.html
        expected_filename = f"{business_slug}-{city_slug}-{service_slug}-page-1.html"

        if expected_filename in sample_files:
            replaced_count += 1
            return f"https://www.localseogen.com/sample-pages/{expected_filename}"
        else:
            # Try to see if there is another matching page format
            # e.g., maybe no service_slug in the filename, or page number is different
            fallback_pattern = f"{business_slug}-{city_slug}-.*-page-1.html"
            found_fallback = None
            for f in sample_files:
                if f.startswith(f"{business_slug}-{city_slug}-") and f.endswith("-page-1.html"):
                    found_fallback = f
                    break
            
            if found_fallback:
                replaced_count += 1
                return f"https://www.localseogen.com/sample-pages/{found_fallback}"
            else:
                print(f"WARNING: Could not find matching sample page for: {full_match}")
                print(f"  Expected: {expected_filename}")
                warnings_count += 1
                return full_match

    # Perform the replacement
    new_content = re.sub(url_pattern, replace_url, content)

    with open(emails_file, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"Replacement complete: {replaced_count} links updated, {warnings_count} warnings.")

if __name__ == "__main__":
    main()
