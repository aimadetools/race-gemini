import re

def main():
    emails_file = "generated_outreach_emails.txt"
    with open(emails_file, "r", encoding="utf-8") as f:
        content = f.read()

    url_pattern = r"https://www\.localseogen\.com/generated-seo-pages/(.*?)\.html"
    matches = set(re.findall(url_pattern, content))
    
    print(f"Found {len(matches)} unique URLs in emails:")
    for m in sorted(matches)[:30]:
        print(" -", m)

if __name__ == "__main__":
    main()
