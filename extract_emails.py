import csv
import re
import requests
from bs4 import BeautifulSoup
import time
from requests_html import HTMLSession # Import HTMLSession

def extract_email_from_url(url):
    """
    Extracts an email address from the given URL using requests-html to handle JavaScript.
    Tries to find mailto links and email patterns in the page text.
    Also attempts to check common contact pages if no email is found on the main page.
    """
    if not url:
        return None

    session = HTMLSession() # Create an HTMLSession object

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

    # Process URLs one by one until an email is found
    for current_url in urls_to_try:
        try:
            print(f"  Attempting to fetch and render {current_url}...")
            r = session.get(current_url, timeout=10)
            r.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)
            r.html.render() # Render the JavaScript
            soup = BeautifulSoup(r.html.html, 'html.parser') # Pass the rendered HTML to BeautifulSoup

            # 1. Look for mailto links
            for link in soup.find_all('a', href=True):
                if 'mailto:' in link['href']:
                    email_match = re.search(r'mailto:([^?]+)', link['href'])
                    if email_match:
                        session.close() # Close the session before returning
                        return email_match.group(1)

            # 2. Look for email patterns in the page text
            email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
            emails = re.findall(email_pattern, soup.get_text())
            
            # Filter out common false positives (e.g., placeholder emails, image names)
            valid_emails = [email for email in emails if not email.endswith(('.png', '.jpg', '.gif', '.svg')) and 'example.com' not in email]
            if valid_emails:
                session.close() # Close the session before returning
                return valid_emails[0]

        except requests.exceptions.Timeout:
            print(f"    Timeout accessing {current_url}")
        except requests.exceptions.TooManyRedirects:
            print(f"    Too many redirects for {current_url}")
        except requests.exceptions.RequestException as e:
            # print(f"    Error accessing {current_url}: {e}")
            pass # Suppress specific errors for alternative URLs, as we're trying multiple
        except Exception as e:
            print(f"    An unexpected error occurred for {current_url}: {e}")
        
        # If no email found on this URL, try the next one in urls_to_try
    
    session.close() # Close the session if no email is found after trying all URLs
    return None

def main():
    input_csv_path = 'outreach-targets.csv'
    output_csv_path = 'outreach-targets.csv' # Overwrite the original file
    updated_rows = []

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

    print("Starting email extraction process...")
    for i, row in enumerate(original_data):
        website = row.get('Website', '').strip()
        email = row.get('Email', '').strip()

        if website and not email:
            total_websites_to_check += 1
            print(f"Checking {website} for email ({i+1}/{len(original_data)})...")
            extracted_email = extract_email_from_url(website)
            if extracted_email:
                row['Email'] = extracted_email
                emails_found_count += 1
                print(f"  Found email: {extracted_email}")
            else:
                print(f"  No email found for {website}")
            time.sleep(1) # Be polite and avoid hammering servers

        # Debugging: Check keys before appending
        # print(f"Row keys: {row.keys()}")
        # print(f"Fieldnames: {fieldnames}")
        updated_rows.append(row)

    with open(output_csv_path, mode='w', newline='', encoding='utf-8') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)

    print(f"\nEmail extraction complete. Found {emails_found_count} new emails for {total_websites_to_check} websites checked.")
    print(f"Updated data saved to {output_csv_path}")

if __name__ == '__main__':
    main()
