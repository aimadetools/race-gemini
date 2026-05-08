
import csv
import json
import io
import re

def parse_outreach_targets(file_path):
    with open(file_path, 'r') as f_in:
        # Read all lines and filter out comments
        lines = [line for line in f_in if not line.startswith('#')]
        
        # Use StringIO to treat the filtered lines as a file-like object for csv.DictReader
        # This handles the case where the header might be on a non-commented line
        data_io = io.StringIO(''.join(lines))
        
        # The first non-comment line should be the header
        reader = csv.DictReader(data_io)
        
        parsed_data = []
        for row in reader:
            # Clean up potential leading/trailing whitespace in keys and values
            cleaned_row = {k.strip(): v.strip() if v is not None else '' for k, v in row.items()}
            parsed_data.append(cleaned_row)
        return parsed_data

def extract_email_from_text(text):
    # Regex for common email patterns
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    emails = re.findall(email_pattern, text)
    if emails:
        # Prioritize emails that don't look like image or script file names
        # and don't contain common image extensions
        valid_emails = [email for email in emails if not re.search(r'\.(png|jpg|jpeg|gif|svg|js|css)$', email, re.IGNORECASE)]
        if valid_emails:
            return valid_emails[0]
        return emails[0] # Fallback to first found email if no "valid" ones
    return None

if __name__ == '__main__':
    data = parse_outreach_targets('outreach-targets.csv')
    
    # Identify entries with a website but a missing email address
    needs_email = [row for row in data if row['Website'] and not row['Email']]
    
    # Print the URLs from which emails need to be extracted
    urls_to_fetch = []
    for entry in needs_email:
        website = entry['Website']
        if not website.startswith('http://') and not website.startswith('https://'):
            website = 'https://' + website # Assume HTTPS, can retry with HTTP if fails
        urls_to_fetch.append(website)
    
    print(json.dumps(urls_to_fetch, indent=2))
