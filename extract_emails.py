import csv
import re
import requests
from bs4 import BeautifulSoup
import time

def extract_email_from_url(url):
    """
    Extracts an email address from the given URL.
    Tries to find mailto links and email patterns in the page text.
    """
    if not url:
        return None

    # Ensure the URL has a scheme
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'http://' + url

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)
        soup = BeautifulSoup(response.text, 'html.parser')

        # 1. Look for mailto links
        for link in soup.find_all('a', href=True):
            if 'mailto:' in link['href']:
                email_match = re.search(r'mailto:([^?]+)', link['href'])
                if email_match:
                    return email_match.group(1)

        # 2. Look for email patterns in the page text
        # A more robust regex for emails
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(email_pattern, soup.get_text())
        
        # Filter out common false positives (e.g., placeholder emails, image names)
        # This is a basic filter and might need refinement
        valid_emails = [email for email in emails if not email.endswith(('.png', '.jpg', '.gif', '.svg')) and 'example.com' not in email]
        if valid_emails:
            # Prioritize unique domains, or just return the first one for simplicity
            return valid_emails[0]

    except requests.exceptions.RequestException as e:
        print(f"Error accessing {url}: {e}")
    except Exception as e:
        print(f"An unexpected error occurred for {url}: {e}")
    
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
