import os
import re

def clean_slug(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())

def main():
    emails_file = "generated_outreach_emails.txt"
    sample_pages_dir = "sample-pages"
    
    if not os.path.exists(emails_file):
        print(f"Error: {emails_file} not found.")
        return

    sample_files = [f for f in os.listdir(sample_pages_dir) if f.endswith("-page-1.html")]
    print(f"Loaded {len(sample_files)} sample files.")

    with open(emails_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Matches URL format in emails
    url_pattern = r"https://www\.localseogen.com/generated-seo-pages/(.*?)\.html"
    matches = re.findall(url_pattern, content)
    print(f"Found {len(matches)} URLs in emails.")

    matched_count = 0
    unmatched_count = 0

    for url_slug in matches:
        # url_slug looks like e.g. "plumbing-services-in-dallas-jensens-plumbing"
        # or "chicago-in-identified-vanguard-plumbing-and-sewer"
        # Let's extract service/city/business
        # Split by -in-
        if '-in-' in url_slug:
            parts = url_slug.split('-in-')
            left = parts[0] # service
            right = parts[1] # city-business
        else:
            right = url_slug
            left = ""

        # Let's look for any sample file that matches the right side or business slug
        # Find which sample file has the business slug in it
        found_file = None
        for f in sample_files:
            # check if city is in f
            # cities in right side are usually the first word: e.g. "dallas-jensens-plumbing" -> "dallas"
            right_words = right.split('-')
            city = right_words[0]
            business_words = right_words[1:]
            business_slug = "-".join(business_words)
            
            # Simple check: does the filename start with the business_slug and contain the city?
            # Filename is {business_slug}-{city_slug}-{service_slug}-page-1.html
            f_clean = f.lower()
            if city in f_clean and business_slug in f_clean:
                found_file = f
                break
            
            # Fallback check: just check if the normalized business name is in the filename
            norm_business = clean_slug(business_slug)
            if norm_business and norm_business in clean_slug(f_clean) and city in f_clean:
                found_file = f
                break

        if found_file:
            matched_count += 1
            print(f"STRICT MATCH: {url_slug} -> {found_file}")
        else:
            unmatched_count += 1
            # print(f"NO MATCH: {url_slug}")

    print(f"\nStrict Summary: Matched {matched_count}/{len(matches)} URLs. Unmatched: {unmatched_count}")

if __name__ == "__main__":
    main()
