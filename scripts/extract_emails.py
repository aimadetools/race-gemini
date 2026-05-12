import csv
import re
import asyncio
from bs4 import BeautifulSoup
import time
from playwright.async_api import async_playwright

def clean_email(email):
    """
    Cleans an email string by extracting the first valid email pattern found.
    Returns an empty string if no valid email pattern is found.
    """
    if not isinstance(email, str):
        return ""
    # More robust email regex, making it truly case-insensitive.
    match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', email, re.IGNORECASE)
    return match.group(0) if match else ""

async def extract_email_from_url(url):
    """
    Extracts an email address from the given URL using Playwright to handle JavaScript.
    Tries to find mailto links and email patterns in the page text.
    Also attempts to check common contact pages if no email is found on the main page.
    """
    if not url:
        return None

    # List of URLs to try, prioritizing HTTPS and common contact pages
    urls_to_try = []
    
    # Base URL with scheme handling
    base_url_secure = url
    base_url_insecure = url

    if not url.startswith('http://') and not url.startswith('https://'):
        base_url_secure = 'https://' + url
        base_url_insecure = 'http://' + url
    elif url.startswith('http://'):
        base_url_secure = 'https://' + url[len('http://'):]
        # base_url_insecure is already correct
    elif url.startswith('https://'):
        base_url_insecure = 'http://' + url[len('https://'):]
        # base_url_secure is already correct

    urls_to_try.append(base_url_secure)
    if base_url_secure != base_url_insecure: # Avoid trying http if original was https
        urls_to_try.append(base_url_insecure)
    
    # Common contact page suffixes
    contact_suffixes = ['/contact', '/contact-us', '/about', '/info', '/reach-us']

    # Add contact pages for both secure and insecure base URLs
    for suffix in contact_suffixes:
        if base_url_secure not in urls_to_try: # Ensure base URL is not duplicated
            urls_to_try.append(base_url_secure + suffix)
        if base_url_insecure not in urls_to_try and base_url_secure != base_url_insecure:
            urls_to_try.append(base_url_insecure + suffix)

    async with async_playwright() as p:
        browser = None
        try:
            # Use headless=True for production, but can be False for debugging
            browser = await p.chromium.launch(headless=True) 
            page = await browser.new_page()

            # Process URLs one by one until an email is found
            for current_url in urls_to_try:
                try:
                    print(f"  Attempting to fetch and render {current_url}...")
                    # Adjust timeout as needed, 15 seconds is 15000 milliseconds
                    await page.goto(current_url, timeout=15000, wait_until='domcontentloaded') 
                    content = await page.content()
                    soup = BeautifulSoup(content, 'html.parser')

                    # 1. Look for mailto links
                    for link in soup.find_all('a', href=True):
                        if 'mailto:' in link['href']:
                            email_match = re.search(r'mailto:([^?]+)', link['href'])
                            if email_match:
                                cleaned = clean_email(email_match.group(1))
                                if cleaned:
                                    return cleaned

                    # 2. Look for email patterns in the page text and script tags
                    # Enhanced email pattern to catch common obfuscation methods
                    # This pattern looks for standard emails and also attempts to de-obfuscate common patterns
                    email_pattern_enhanced = re.compile(
                        r'\b'
                        r'(?P<user>[a-zA-Z0-9._%+-]+)' # User part
                        r'\s*(?:(?:at)|@)\s*'           # 'at' or '@'
                        r'(?P<domain>[a-zA-Z0-9.-]+)'  # Domain part
                        r'\s*(?:(?:dot)|\.)\s*'         # 'dot' or '.'
                        r'(?P<tld>[a-zA-Z]{2,})'        # TLD part
                        r'\b',
                        re.IGNORECASE
                    )
                    email_pattern_standard = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
                    
                    # Search in general page text
                    emails_in_text = re.findall(email_pattern_standard, soup.get_text())
                    for match in email_pattern_enhanced.finditer(soup.get_text()):
                        deobfuscated_email = f"{match.group('user')}@{match.group('domain')}.{match.group('tld')}"
                        emails_in_text.append(deobfuscated_email)

                    # Search in script tags
                    emails_in_scripts = []
                    for script in soup.find_all('script'):
                        if script.string:
                            emails_in_scripts.extend(re.findall(email_pattern_standard, script.string))
                            for match in email_pattern_enhanced.finditer(script.string):
                                deobfuscated_email = f"{match.group('user')}@{match.group('domain')}.{match.group('tld')}"
                                emails_in_scripts.append(deobfuscated_email)
                    
                    all_found_emails = emails_in_text + emails_in_scripts

                    # Filter out common false positives (e.g., placeholder emails, image names)
                    valid_emails = [clean_email(email) for email in all_found_emails if not email.endswith(('.png', '.jpg', '.gif', '.svg')) and 'example.com' not in email.lower()]
                    valid_emails = [email for email in valid_emails if email] # Remove None values after cleaning
                    if valid_emails:
                        return valid_emails[0]

                except Exception as e:
                    print(f"    Error processing {current_url}: {e}")
                
                # If no email found on this URL, try the next one in urls_to_try
        except Exception as e:
            print(f"  Playwright browser launch error: {e}")
        finally:
            if browser:
                await browser.close()
    return None

def main():
    input_csv_path = 'outreach-targets.csv'
    output_csv_path = 'outreach-targets.csv' # Overwrite the original file
    updated_rows = []
    
    # Read the CSV, skipping comment lines using a generator
    with open(input_csv_path, mode='r', encoding='utf-8') as infile:
        # Filter out comment lines and empty lines
        filtered_lines = (line for line in infile if not line.strip().startswith('#') and line.strip())
        
        reader = csv.DictReader(filtered_lines)
        fieldnames = reader.fieldnames
        original_data = list(reader)

    emails_found_count = 0
    total_websites_to_check = 0

    print("Starting email extraction and cleaning process...")
    for i, row in enumerate(original_data):
        website = row.get('Website', '').strip()
        email = row.get('Email', '').strip()

        # Clean existing email, if any
        if email:
            cleaned_email = clean_email(email)
            if cleaned_email != email:
                print(f"  Cleaning email for {website}: '{email}' -> '{cleaned_email}'")
                row['Email'] = cleaned_email

        if website and not row['Email']: # Only try to extract if website exists and email is still empty after cleaning
            total_websites_to_check += 1
            print(f"Checking {website} for email ({i+1}/{len(original_data)})...")
            extracted_email = asyncio.run(extract_email_from_url(website))
            if extracted_email:
                row['Email'] = extracted_email
                emails_found_count += 1
                print(f"  Found email: {extracted_email}")
            else:
                print(f"  No new email found for {website}")
            time.sleep(1) # Be polite and avoid hammering servers
        elif not website:
            print(f"  Skipping row {i+1} due to missing website.")

        updated_rows.append(row)

    with open(output_csv_path, mode='w', newline='', encoding='utf-8') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)

    print(f"\nEmail extraction complete. Found {emails_found_count} new emails for {total_websites_to_check} websites checked.")
    print(f"Updated data saved to {output_csv_path}")

if __name__ == '__main__':
    main()